function getErrorDiagnostics(error) {
  if (error instanceof TchapDeliveryError) {
    return error.diagnostics;
  }

  const diagnostics = { code: 'UNKNOWN_ERROR' };
  const code = error?.code ?? error?.errcode;
  if (typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(code)) {
    diagnostics.code = code;
  }
  if (typeof error?.connect === 'boolean') {
    diagnostics.connect = error.connect;
  }
  if (Number.isInteger(error?.statusCode) && error.statusCode >= 100 && error.statusCode <= 599) {
    diagnostics.statusCode = error.statusCode;
  }
  return diagnostics;
}

class TchapDeliveryError extends Error {
  constructor(error, metadata) {
    const diagnostics = { ...metadata, ...getErrorDiagnostics(error) };
    super(`Échec Tchap : ${diagnostics.code ?? diagnostics.stage}.`, { cause: error });
    this.diagnostics = diagnostics;
  }
}

module.exports = { getErrorDiagnostics, TchapDeliveryError };
