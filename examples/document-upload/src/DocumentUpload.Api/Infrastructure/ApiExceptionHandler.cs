using DocumentUpload.Api.Common.Errors;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace DocumentUpload.Api.Infrastructure;

public sealed class ApiExceptionHandler(
    ILogger<ApiExceptionHandler> logger,
    IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException)
        {
            return false;
        }

        var (status, title, detail) = exception switch
        {
            UploadValidationException =>
                (StatusCodes.Status400BadRequest, "Invalid upload", exception.Message),
            ObjectStorageUnavailableException =>
                (StatusCodes.Status503ServiceUnavailable, "Storage unavailable", "The upload could not be stored."),
            _ =>
                (StatusCodes.Status500InternalServerError, "Request failed", "An unexpected error occurred.")
        };

        if (status >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Request failed; trace {TraceId}", context.TraceIdentifier);
        }
        else
        {
            logger.LogInformation("Request returned {StatusCode}; trace {TraceId}", status, context.TraceIdentifier);
        }

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Type = "about:blank"
        };
        problem.Extensions["traceId"] = context.TraceIdentifier;
        context.Response.StatusCode = status;

        if (!await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problem,
            Exception = exception
        }))
        {
            await context.Response.WriteAsJsonAsync(problem, cancellationToken);
        }

        return true;
    }
}
