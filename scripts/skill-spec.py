"""Safe YAML metadata and optional official skills-ref validation; no filesystem writes."""
import json
from pathlib import Path
import re
import sys
import unicodedata

try:
    import yaml
except ImportError:
    print(json.dumps({"errors": ["PyYAML missing; activate validation venv and install requirements-validation.txt"]}))
    sys.exit(2)


class UniqueLoader(yaml.SafeLoader):
    def compose_node(self, parent, index):
        if self.check_event(yaml.AliasEvent):
            raise ValueError("YAML aliases are not accepted in distributed skill metadata")
        return super().compose_node(parent, index)


def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if not isinstance(key, str) or key in result:
            raise ValueError("Metadata keys must be unique strings")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)
allowed = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}


def validate(directory, reference):
    directory = Path(directory)
    text = (directory / "SKILL.md").read_text(encoding="utf-8")
    match = re.match(r"\A---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)", text)
    if not match:
        raise ValueError("Missing YAML frontmatter")
    data = yaml.load(match.group(1), Loader=UniqueLoader)
    if not isinstance(data, dict) or set(data) - allowed:
        raise ValueError("Frontmatter must be a mapping of Agent Skills specification fields")
    name, description = data.get("name"), data.get("description")
    if not isinstance(name, str) or not name or len(name) > 64:
        raise ValueError("Skill name must be 1-64 characters")
    normalized = unicodedata.normalize("NFKC", name)
    if name != normalized or name != name.lower() or name.startswith("-") or name.endswith("-") or "--" in name or not all(c.isalnum() or c == "-" for c in name):
        raise ValueError("Invalid lowercase skill name")
    if name != directory.name:
        raise ValueError("Name must match parent directory")
    if not isinstance(description, str) or not description.strip() or len(description) > 1024:
        raise ValueError("Description must be a nonempty string of at most 1024 characters")
    for field in ["license", "compatibility", "allowed-tools"]:
        if field in data and not isinstance(data[field], str):
            raise ValueError(field + " must be a string")
    if len(data.get("compatibility", "")) > 500:
        raise ValueError("Compatibility exceeds 500 characters")
    if "metadata" in data and (not isinstance(data["metadata"], dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in data["metadata"].items())):
        raise ValueError("metadata must map strings to strings")
    if not text[match.end():].strip():
        raise ValueError("Instructions are empty")
    if reference:
        # PyPI skills-ref 0.1.0 exposes agentskills; current upstream uses skills_ref.
        import importlib.util
        from importlib.metadata import version
        version("skills-ref")
        if importlib.util.find_spec("skills_ref"):
            from skills_ref.validator import validate as official_validate
        else:
            from agentskills.validator import validate as official_validate
        errors = official_validate(directory)
        if errors:
            raise ValueError("skills-ref: " + "; ".join(errors))
    return {"name": name, "description": description}


errors, output = [], []
reference = "--reference" in sys.argv
for arg in [a for a in sys.argv[1:] if a != "--reference"]:
    try:
        output.append(validate(arg, reference))
    except Exception as error:
        # Do not echo YAML contents or credential values from failed parsing.
        message = str(error) if isinstance(error, (ValueError, ImportError, FileNotFoundError)) else "Malformed or unsafe YAML"
        errors.append(f"{Path(arg).name}: {message}")
print(json.dumps({"skills": output, "errors": errors, "reference": reference}, ensure_ascii=False))
sys.exit(1 if errors else 0)
