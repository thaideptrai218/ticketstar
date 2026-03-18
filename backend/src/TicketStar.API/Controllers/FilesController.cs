using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TicketStar.API.Controllers;

[Authorize]
[ApiController]
[Route("api/files")]
public class FilesController : ApiControllerBase
{
    private readonly IWebHostEnvironment _env;

    private static readonly HashSet<string> AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private const long MaxSizeBytes = 5 * 1024 * 1024; // 5MB

    public FilesController(IWebHostEnvironment env)
    {
        _env = env;
    }

    /// <summary>Upload an image file (organizer use). Returns { url } for the uploaded file.</summary>
    [HttpPost("upload")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided" });

        if (file.Length > MaxSizeBytes)
            return BadRequest(new { message = "File too large (max 5MB)" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { message = "Only jpg, png, webp allowed" });

        try
        {
            var uploadsDir = Path.Combine(_env.WebRootPath, "uploads");
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            await using var stream = System.IO.File.Create(filePath);
            await file.CopyToAsync(stream, ct);

            return Ok(new { url = $"/uploads/{fileName}" });
        }
        catch (Exception)
        {
            return StatusCode(500, new { message = "Failed to save file" });
        }
    }
}
