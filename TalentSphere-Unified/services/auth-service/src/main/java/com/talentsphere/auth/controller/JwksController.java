package com.talentsphere.auth.controller;

import com.talentsphere.auth.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class JwksController {

    @Autowired
    private JwtService jwtService;

    @GetMapping("/.well-known/jwks.json")
    public Map<String, Object> getJwks() {
        return jwtService.getJwkSet().toJSONObject();
    }
}
