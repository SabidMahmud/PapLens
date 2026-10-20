"""Application-level errors independent of the HTTP framework."""


class UploadTooLargeError(ValueError):
    """Raised when an uploaded file exceeds the configured byte limit."""


class UploadReadError(IOError):
    """Raised when an uploaded file cannot be read."""


class InvalidImageError(ValueError):
    """Raised when uploaded bytes do not contain a supported, valid image."""


class PatchExtractionError(RuntimeError):
    """Raised when image patch extraction fails."""


class InferenceExecutionError(RuntimeError):
    """Raised when the model pipeline cannot complete inference."""


class HeatmapGenerationError(RuntimeError):
    """Raised when attention visualization generation fails."""


class UnsupportedUploadFormatError(ValueError):
    """Raised when upload metadata does not describe a JPEG or PNG image."""


class ImageDimensionsExceeded(ValueError):
    """Raised when decoded image dimensions exceed configured safety limits."""


class ModelNotReadyError(RuntimeError):
    """Raised when inference is requested before all models are loaded."""
