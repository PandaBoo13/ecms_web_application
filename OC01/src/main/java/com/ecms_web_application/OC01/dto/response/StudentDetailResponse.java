package com.ecms_web_application.OC01.dto.response;

import com.ecms_web_application.OC01.entity.StudentStatusLog;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class StudentDetailResponse extends StudentResponse {

    private List<GuardianResponse> guardians = new ArrayList<>();
    private List<AcademicHistoryResponse> academicHistories = new ArrayList<>();
    private List<StudentStatusLog> statusLogs = new ArrayList<>();
}

