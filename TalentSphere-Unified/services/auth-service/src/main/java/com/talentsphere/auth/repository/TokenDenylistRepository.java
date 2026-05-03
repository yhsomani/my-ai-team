package com.talentsphere.auth.repository;

import com.talentsphere.auth.entity.TokenDenylistEntry;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TokenDenylistRepository extends JpaRepository<TokenDenylistEntry, String> {
}
