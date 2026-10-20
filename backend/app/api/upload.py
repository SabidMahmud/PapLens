"""Bounded multipart upload reading for the prediction API."""

from fastapi import UploadFile

from app.config import settings
from app.errors import (
    UnsupportedUploadFormatError,
    UploadReadError,
    UploadTooLargeError,
)


UPLOAD_READ_CHUNK_BYTES = 1024 * 1024


async def validate_upload_format(file: UploadFile) -> None:
    """Reject upload metadata that is not consistent with JPEG or PNG."""
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    valid_extensions = (".jpg", ".jpeg", ".png")
    if filename.endswith(valid_extensions) or content_type in {
        "image/jpeg",
        "image/png",
    }:
        return

    await file.close()
    raise UnsupportedUploadFormatError(
        "Unsupported file format. Please upload a JPEG or PNG image."
    )


async def read_upload_with_limit(file: UploadFile) -> bytes:
    """Read an upload incrementally and stop as soon as it exceeds the limit."""
    max_bytes = int(settings.MAX_UPLOAD_MB * 1024 * 1024)

    if file.size is not None and file.size > max_bytes:
        await file.close()
        raise UploadTooLargeError(
            f"File exceeds maximum upload size of {settings.MAX_UPLOAD_MB} MB."
        )

    contents = bytearray()
    try:
        while chunk := await file.read(UPLOAD_READ_CHUNK_BYTES):
            if len(contents) + len(chunk) > max_bytes:
                raise UploadTooLargeError(
                    f"File exceeds maximum upload size of {settings.MAX_UPLOAD_MB} MB."
                )
            contents.extend(chunk)
    except UploadTooLargeError:
        raise
    except Exception as exc:
        raise UploadReadError("Failed to read uploaded file.") from exc
    finally:
        await file.close()

    return bytes(contents)
