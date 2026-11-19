// ============================================================
// FILE: ./src/main/java/com/ecms_web_application/OC01/service/impl/course/AvailabilityServiceImpl.java
// ============================================================
package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.dto.response.course.AvailabilityResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.course.Room;
import com.ecms_web_application.OC01.entity.course.Session;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.RoomRepository;
import com.ecms_web_application.OC01.repository.SessionRepository;
import com.ecms_web_application.OC01.service.AvailabilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AvailabilityServiceImpl implements AvailabilityService {

    private static final int MAX_RANGE_DAYS = 30;
    private static final String[] WEEKDAY_KEYS = {
            "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY",
            "FRIDAY", "SATURDAY", "SUNDAY"
    };

    private final SessionRepository sessionRepository;
    private final RoomRepository roomRepository;
    private final AccountRepository accountRepository;

    // ============================================================
    // ROOM
    // ============================================================
    @Override
    @Transactional(readOnly = true)
    public AvailabilityResponse checkRoomAvailability(Long roomId, LocalDateTime from, LocalDateTime to) {
        validateRange(from, to);

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Phòng không tồn tại"));

        List<Session> busy = sessionRepository.findRoomBusySessionsInRange(roomId, from, to);

        List<AvailabilityResponse.BusySlotInfo> busySlots = busy.stream()
                .map(s -> new AvailabilityResponse.BusySlotInfo(
                        s.getId(),
                        s.getCourse() != null ? s.getCourse().getId() : null,
                        s.getCourse() != null ? s.getCourse().getTitle() : null,
                        s.getStartTime(),
                        s.getEndTime()))
                .toList();

        List<AvailabilityResponse.FreeWindowInfo> freeWindows =
                computeFreeWindows(from, to, busy);

        return new AvailabilityResponse(
                "ROOM",
                room.getId(),
                room.getName(),
                from,
                to,
                busySlots.isEmpty(),
                busySlots,
                freeWindows,
                null);   // weeklyLoad = null cho ROOM
    }

    // ============================================================
    // INSTRUCTOR
    // ============================================================
    @Override
    @Transactional(readOnly = true)
    public AvailabilityResponse checkInstructorAvailability(Long instructorId, LocalDateTime from, LocalDateTime to) {
        validateRange(from, to);

        Account instructor = accountRepository.findById(instructorId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Giảng viên không tồn tại"));

        List<Session> busy = sessionRepository.findTeacherBusySessionsInRange(instructorId, from, to);

        List<AvailabilityResponse.BusySlotInfo> busySlots = busy.stream()
                .map(s -> new AvailabilityResponse.BusySlotInfo(
                        s.getId(),
                        s.getCourse() != null ? s.getCourse().getId() : null,
                        s.getCourse() != null ? s.getCourse().getTitle() : null,
                        s.getStartTime(),
                        s.getEndTime()))
                .toList();

        List<AvailabilityResponse.FreeWindowInfo> freeWindows =
                computeFreeWindows(from, to, busy);

        Map<String, Integer> weeklyLoad = computeWeeklyLoad(busy, from);

        String fullName = instructor.getUserProfile() != null
                && instructor.getUserProfile().getFullName() != null
                && !instructor.getUserProfile().getFullName().isBlank()
                ? instructor.getUserProfile().getFullName()
                : instructor.getEmail();

        return new AvailabilityResponse(
                "INSTRUCTOR",
                instructor.getId(),
                fullName,
                from,
                to,
                busySlots.isEmpty(),
                busySlots,
                freeWindows,
                weeklyLoad);
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private void validateRange(LocalDateTime from, LocalDateTime to) {
        if (from == null || to == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "from và to là bắt buộc");
        }
        if (!from.isBefore(to)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "from phải < to");
        }
        long days = Duration.between(from, to).toDays();
        if (days > MAX_RANGE_DAYS) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Khoảng thời gian không vượt quá " + MAX_RANGE_DAYS + " ngày");
        }
    }

    /**
     * Tính các khoảng trống trong [from, to).
     * Thuật toán: cursor = from; với mỗi busy đã sort by startTime:
     *   - nếu cursor < busy.start → thêm [cursor, busy.start]
     *   - cursor = max(cursor, busy.end)
     * Cuối cùng: nếu cursor < to → thêm [cursor, to]
     *
     * Lưu ý: busy có thể overlap (VD: 2 SESSION liền nhau 17-19, 19-21).
     * Cursor luôn tiến → không bị miss.
     */
    private List<AvailabilityResponse.FreeWindowInfo> computeFreeWindows(
            LocalDateTime from, LocalDateTime to, List<Session> busySorted) {

        List<AvailabilityResponse.FreeWindowInfo> windows = new ArrayList<>();
        LocalDateTime cursor = from;

        for (Session s : busySorted) {
            LocalDateTime bStart = s.getStartTime();
            LocalDateTime bEnd = s.getEndTime();
            if (bStart == null || bEnd == null) continue;

            // Clamp vào [from, to)
            if (bStart.isBefore(from)) bStart = from;
            if (bEnd.isAfter(to)) bEnd = to;
            if (!bStart.isBefore(bEnd)) continue;

            if (cursor.isBefore(bStart)) {
                windows.add(new AvailabilityResponse.FreeWindowInfo(cursor, bStart));
            }
            if (bEnd.isAfter(cursor)) {
                cursor = bEnd;
            }
        }

        if (cursor.isBefore(to)) {
            windows.add(new AvailabilityResponse.FreeWindowInfo(cursor, to));
        }
        return windows;
    }

    /**
     * Tải theo tuần: đếm số buổi của tuần đầu tiên trong [from, from + 7 days).
     * Key = "MONDAY".."SUNDAY", value = số buổi trong ngày đó.
     * Trả map đầy đủ 7 ngày (giá trị 0 nếu không có buổi).
     */
    private Map<String, Integer> computeWeeklyLoad(List<Session> sessions, LocalDateTime from) {
        Map<String, Integer> load = new LinkedHashMap<>();
        for (String k : WEEKDAY_KEYS) load.put(k, 0);

        LocalDateTime weekEnd = from.plusDays(7);

        for (Session s : sessions) {
            LocalDateTime start = s.getStartTime();
            if (start == null) continue;
            if (start.isBefore(from) || !start.isBefore(weekEnd)) continue;

            String key = switch (start.getDayOfWeek()) {
                case MONDAY -> "MONDAY";
                case TUESDAY -> "TUESDAY";
                case WEDNESDAY -> "WEDNESDAY";
                case THURSDAY -> "THURSDAY";
                case FRIDAY -> "FRIDAY";
                case SATURDAY -> "SATURDAY";
                case SUNDAY -> "SUNDAY";
            };
            load.merge(key, 1, Integer::sum);
        }
        return load;
    }
}