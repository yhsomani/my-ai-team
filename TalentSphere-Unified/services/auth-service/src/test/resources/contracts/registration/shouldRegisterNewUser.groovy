import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description("Should reject local credential registration by default because Supabase Auth is primary")
    request {
        method 'POST'
        url '/api/v1/auth/register'
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
        status GONE()
        body([
            success: false,
            message: "Local credential registration is disabled. Use Supabase Auth."
        ])
        headers {
            contentType(applicationJson())
        }
    }
}
