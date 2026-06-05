package com.biotrack.protocolservice.repository;

import com.biotrack.protocolservice.entity.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SiteRepository extends JpaRepository<Site, Long> {
    List<Site> findByDeletedFalse();
    List<Site> findByDeletedTrue();
    Optional<Site> findBySiteIdAndDeletedFalse(Long id);
    List<Site> findByProtocols_ProtocolId(Long protocolId);
}