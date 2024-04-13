class ApiError extends Error{
    constructor(
        statusCode,
        msg = "Somethig went wrong",
        errors = [],
        stack = ""
    ) {
        super(msg)
        this.statusCode = statusCode
        this.data = null
        this.message = msg
        this.success = false
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constuctor)
        }
    }
}

export {ApiError}