class ApiResponse{
    constructor(
        statusCode,
        data,
        msg = "Success"
    ) {
        this.data = data,
        this.message = msg,
        this.success = statusCode <400
    }
}