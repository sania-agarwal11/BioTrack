package com.biotrack.protocolservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.biotrack.protocolservice.entity.Protocol;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProtocolRepository extends JpaRepository<Protocol, Long> {

    List<Protocol> findByDeletedFalse();
    List<Protocol> findByDeletedTrue();
    Optional<Protocol> findByProtocolIdAndDeletedFalse(Long id);
    List<Protocol> findBySites_SiteIdAndDeletedFalse(Long siteId);
}
