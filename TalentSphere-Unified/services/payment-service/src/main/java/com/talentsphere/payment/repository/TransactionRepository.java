package com.talentsphere.payment.repository;
import com.talentsphere.payment.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, String> {
    Optional<Transaction> findBySessionId(String sessionId);
    List<Transaction> findByUserId(String userId);
}
