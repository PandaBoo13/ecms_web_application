package com.ecms_web_application.OC01.dto.response;

import com.ecms_web_application.OC01.entity.LeadAssignmentLog;
import com.ecms_web_application.OC01.entity.LeadStatusLog;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class LeadDetailResponse extends LeadResponse {

    private List<LeadInteractionResponse> interactions = new ArrayList<>();
    private List<LeadPlacementTestResponse> placementTests = new ArrayList<>();
    private List<LeadStatusLog> statusLogs = new ArrayList<>();
    private List<LeadAssignmentLog> assignmentLogs = new ArrayList<>();
}

