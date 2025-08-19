"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isErrorWithMessage = isErrorWithMessage;
exports.getErrorMessage = getErrorMessage;
function isErrorWithMessage(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string');
}
function getErrorMessage(error) {
    if (isErrorWithMessage(error)) {
        return error.message;
    }
    return 'An unknown error occurred';
}
