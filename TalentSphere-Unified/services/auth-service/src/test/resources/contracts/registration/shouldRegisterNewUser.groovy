import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description("Should return 200 OK and a new user upon registration")
    request {
        method 'POST'
        url '/api/auth/register'
        body([
            email: "test-contract@example.com",
            password: "SecurePassword123!",
            fullName: "Contract Test User"
        ])
        headers {
            contentType(applicationJson())
        }
    }
    response {
        status OK()
        body([
            status: "SUCCESS",
            message: "Operation completed successfully",
            data: [
                id: anyUuid(),
                email: "test-contract@example.com",
                roles: ["ROLE_USER"]
            ]
        ])
        headers {
            contentType(applicationJson())
        }
    }
}
