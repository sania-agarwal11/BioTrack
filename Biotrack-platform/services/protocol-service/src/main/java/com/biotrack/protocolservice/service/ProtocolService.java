package com.biotrack.protocolservice.service;

import com.biotrack.protocolservice.dto.request.ProtocolRequestDTO;
import com.biotrack.protocolservice.dto.response.ProtocolResponseDTO;
import com.biotrack.protocolservice.enums.ProtocolPhase;
import java.util.List;

public interface ProtocolService {

    ProtocolResponseDTO addProtocol(ProtocolRequestDTO dto);

    List<ProtocolResponseDTO> getAllProtocols();

    ProtocolResponseDTO getProtocolById(Long id);

    ProtocolResponseDTO updateProtocol(Long id, ProtocolRequestDTO dto);

    String deleteProtocol(Long id);

    ProtocolResponseDTO updateProtocolPhase(Long id, ProtocolPhase phase);

    ProtocolResponseDTO closeProtocol(Long id);

    ProtocolResponseDTO assignSiteToProtocol(Long protocolId, Long siteId);

    List<ProtocolResponseDTO> getProtocolsBySite(Long siteId);

    List<ProtocolResponseDTO> getDeletedProtocols();

    ProtocolResponseDTO restoreProtocol(Long id);
}

