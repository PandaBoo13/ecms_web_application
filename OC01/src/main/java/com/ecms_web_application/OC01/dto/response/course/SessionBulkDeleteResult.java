package com.ecms_web_application.OC01.dto.response.course;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Kết quả xóa hàng loạt session.
 * - deletedIds: các session đã xóa thành công
 * - skippedIds: các session bị bỏ qua (vd: đã COMPLETED — không cho xóa)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionBulkDeleteResult {

    private List<Long> deletedIds;
    private List<Long> skippedIds;
    private int totalRequested;
    private String message;
}