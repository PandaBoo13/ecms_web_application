package com.ecms_web_application.OC01.generic.mapper;

import com.ecms_web_application.OC01.dto.response.RoomResponse;
import com.ecms_web_application.OC01.dto.response.course.*;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.course.*;
import com.ecms_web_application.OC01.entity.enums.ResourceStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class CourseModuleMapper {

    // ============================================================
    // 0. COURSE (Gộp từ CourseMapper cũ)
    // ============================================================
    public CourseResponse toCourseResponse(Course c) {
        if (c == null) return null;
        CourseResponse r = new CourseResponse();
        copyCommonCourseFields(c, r);
        return r;
    }

    public CourseDetailResponse toCourseDetailResponse(Course c, List<CourseResource> resources) {
        if (c == null) return null;
        CourseDetailResponse r = new CourseDetailResponse();
        copyCommonCourseFields(c, r);
        r.setDescription(c.getDescription());
        r.setOutcomes(c.getOutcomes());

        List<CourseResourceResponse> items = new ArrayList<>();
        if (resources != null) {
            for (CourseResource res : resources) {
                items.add(toCourseResourceResponse(res));
            }
        }
        r.setResources(items);
        return r;
    }

    private void copyCommonCourseFields(Course c, CourseResponse r) {
        r.setId(c.getId());
        r.setCode(c.getCode());
        r.setSlug(c.getSlug());
        r.setDisplayCode(c.getDisplayCode());
        r.setTitle(c.getTitle());
        r.setShortDescription(c.getShortDescription());
        r.setThumbnailUrl(c.getThumbnailUrl());
        r.setPrice(c.getPrice());
        r.setOldPrice(c.getOldPrice());
        r.setIsFree(c.getIsFree());
        r.setCourseType(c.getCourseType() != null ? c.getCourseType().name() : null);
        r.setProgressType(c.getProgressType() != null ? c.getProgressType().name() : null);
        r.setStatus(c.getStatus() != null ? c.getStatus().name() : null);

        if (c.getTeacher() != null) {
            r.setTeacherId(c.getTeacher().getId());
            if (c.getTeacher().getUserProfile() != null) {
                r.setTeacherName(c.getTeacher().getUserProfile().getFullName());
            }
        }
        if (c.getCreatedBy() != null) r.setCreatedById(c.getCreatedBy().getId());
        if (c.getCategory() != null) {
            r.setCategoryId(c.getCategory().getId());
            r.setCategoryName(c.getCategory().getName());
        }
        if (c.getRoom() != null) {
            r.setRoomId(c.getRoom().getId());
            r.setRoomName(c.getRoom().getName());
        }
        r.setMinStudents(c.getMinStudents());
        r.setMaxStudents(c.getMaxStudents());
        r.setCurrentStudents(c.getCurrentStudents());
        r.setStartDate(c.getStartDate());
        r.setEndDate(c.getEndDate());
        r.setScheduleDays(c.getScheduleDays());
        r.setSessionStartTime(c.getSessionStartTime());
        r.setSessionEndTime(c.getSessionEndTime());
        r.setCopiedFromCourseId(c.getCopiedFromCourseId());
        r.setLearningMode(c.getLearningMode());
        r.setAllowedRoomIds(c.getAllowedRoomIds());
        r.setTotalSessionsExpected(c.getTotalSessionsExpected());
        r.setCreatedAt(c.getCreatedAt());
        r.setUpdatedAt(c.getUpdatedAt());
    }

    // ============================================================
    // 1. RESOURCE
    // ============================================================
    public CourseResourceResponse toCourseResourceResponse(CourseResource r) {
        if (r == null) return null;
        CourseResourceResponse res = new CourseResourceResponse();
        res.setId(r.getId());
        res.setCourseId(r.getCourse() != null ? r.getCourse().getId() : null);
        res.setParentId(r.getParent() != null ? r.getParent().getId() : null);
        res.setResourceType(r.getResourceType() != null ? r.getResourceType().name() : null);
        res.setTitle(r.getTitle());
        res.setDescription(r.getDescription());
        res.setOrderIndex(r.getOrderIndex());
        res.setIsRequired(r.getIsRequired());
        res.setIsFreePreview(r.getIsFreePreview());
        res.setDuration(r.getDuration());
        res.setContent(r.getContent());
        res.setThumbnailUrl(r.getThumbnailUrl());
        res.setFileName(r.getFileName());
        res.setFileUrl(r.getFileUrl());
        res.setFileSize(r.getFileSize());
        res.setFileFormat(r.getFileFormat());
        res.setMimeType(r.getMimeType());
        res.setMaxAttempts(r.getMaxAttempts());
        res.setPassingScore(r.getPassingScore());
        res.setTimeLimit(r.getTimeLimit());
        res.setPoints(r.getPoints());
        res.setDeadline(r.getDeadline());
        res.setSettings(r.getSettings());
        res.setStatus(r.getStatus() != null ? r.getStatus().name() : null);
        res.setAvailableFrom(r.getAvailableFrom());
        res.setAvailableUntil(r.getAvailableUntil());
        res.setQuizCategory(r.getQuizCategory() != null ? r.getQuizCategory().name() : null);
        res.setHashtagFilter(r.getHashtagFilter());
        res.setTotalQuestions(r.getTotalQuestions());
        res.setShuffleQuestions(r.getShuffleQuestions());
        res.setCreatedAt(r.getCreatedAt());
        res.setUpdatedAt(r.getUpdatedAt());
        return res;
    }

    public ResourceTreeResponse toResourceTreeResponse(CourseResource r) {
        ResourceTreeResponse t = new ResourceTreeResponse();
        t.setId(r.getId());
        t.setResourceType(r.getResourceType().name());
        t.setTitle(r.getTitle());
        t.setOrderIndex(r.getOrderIndex());
        t.setIsRequired(r.getIsRequired());
        t.setIsFreePreview(r.getIsFreePreview());
        t.setDuration(r.getDuration());
        t.setFileUrl(r.getFileUrl());
        t.setStatus(r.getStatus() != null ? r.getStatus().name() : null);
        t.setQuizCategory(r.getQuizCategory() != null ? r.getQuizCategory().name() : null);
        t.setPassingScore(r.getPassingScore());
        t.setMaxAttempts(r.getMaxAttempts());
        t.setHashtagFilter(r.getHashtagFilter());
        return t;
    }

    public CourseResource cloneResource(CourseResource srcR, Course newCourse, CourseResource newParent, Account currentUser) {
        CourseResource newR = new CourseResource();
        newR.setCourse(newCourse);
        newR.setParent(newParent);
        newR.setResourceType(srcR.getResourceType());
        newR.setTitle(srcR.getTitle());
        newR.setDescription(srcR.getDescription());
        newR.setOrderIndex(srcR.getOrderIndex());
        newR.setIsRequired(srcR.getIsRequired());
        newR.setIsFreePreview(srcR.getIsFreePreview());
        newR.setDuration(srcR.getDuration());
        newR.setFileUrl(srcR.getFileUrl());
        newR.setFileName(srcR.getFileName());
        newR.setFileSize(srcR.getFileSize());
        newR.setFileFormat(srcR.getFileFormat());
        newR.setMimeType(srcR.getMimeType());
        newR.setThumbnailUrl(srcR.getThumbnailUrl());
        newR.setContent(srcR.getContent());
        newR.setMaxAttempts(srcR.getMaxAttempts());
        newR.setPassingScore(srcR.getPassingScore());
        newR.setTimeLimit(srcR.getTimeLimit());
        newR.setPoints(srcR.getPoints());
        newR.setSettings(srcR.getSettings());
        newR.setStatus(ResourceStatus.DRAFT);
        newR.setQuizCategory(srcR.getQuizCategory());
        newR.setHashtagFilter(srcR.getHashtagFilter());
        newR.setTotalQuestions(srcR.getTotalQuestions());
        newR.setShuffleQuestions(srcR.getShuffleQuestions());
        newR.setCreatedBy(currentUser);
        return newR;
    }

    // ============================================================
    // 2. QUESTION
    // ============================================================
    public QuestionResponse toQuestionResponse(Question q) {
        QuestionResponse r = new QuestionResponse();
        r.setId(q.getId());
        r.setCourseId(q.getCourse().getId());
        if (q.getLesson() != null) {
            r.setLessonId(q.getLesson().getId());
            r.setLessonTitle(q.getLesson().getTitle());
        }
        r.setQuestionType(q.getQuestionType().name());
        r.setContent(q.getContent());
        r.setOptions(q.getOptions());
        r.setCorrectAnswer(q.getCorrectAnswer());
        r.setExplanation(q.getExplanation());
        r.setHashtag(q.getHashtag());
        r.setPoints(q.getPoints());
        r.setOrderIndex(q.getOrderIndex());
        r.setStatus(q.getStatus() != null ? q.getStatus().name() : null);
        r.setCreatedAt(q.getCreatedAt());
        r.setUpdatedAt(q.getUpdatedAt());
        return r;
    }

    public Question cloneQuestion(Question sq, Course newCourse, CourseResource newLesson) {
        Question nq = new Question();
        nq.setCourse(newCourse);
        nq.setLesson(newLesson);
        nq.setQuestionType(sq.getQuestionType());
        nq.setContent(sq.getContent());
        nq.setOptions(sq.getOptions());
        nq.setCorrectAnswer(sq.getCorrectAnswer());
        nq.setExplanation(sq.getExplanation());
        nq.setHashtag(sq.getHashtag());
        nq.setPoints(sq.getPoints());
        nq.setOrderIndex(sq.getOrderIndex());
        nq.setStatus(sq.getStatus());
        return nq;
    }

    // ============================================================
    // 3. QUIZ & QUIZ ATTEMPT
    // ============================================================
    public QuizResponse toQuizResponse(CourseResource r) {
        QuizResponse res = new QuizResponse();
        copyToQuizResponse(r, res);
        return res;
    }

    public void copyToQuizResponse(CourseResource r, QuizResponse res) {
        res.setId(r.getId());
        res.setCourseId(r.getCourse().getId());
        res.setTitle(r.getTitle());
        res.setQuizType(r.getQuizCategory() != null ? r.getQuizCategory().name() : null);
        res.setPassingScore(r.getPassingScore() != null ? r.getPassingScore().intValue() : null);
        res.setMaxAttempts(r.getMaxAttempts());
        res.setTimeLimit(r.getTimeLimit());
        res.setShuffleQuestions(r.getShuffleQuestions());
        res.setTotalQuestions(r.getTotalQuestions());
        res.setHashtagFilter(r.getHashtagFilter());
        res.setAvailableFrom(r.getAvailableFrom());
        res.setAvailableUntil(r.getAvailableUntil());
        res.setCreatedAt(r.getCreatedAt());
        res.setUpdatedAt(r.getUpdatedAt());
    }

    public QuizQuestionView toQuizQuestionView(Question q, boolean showAnswer) {
        QuizQuestionView v = new QuizQuestionView();
        v.setId(q.getId());
        v.setContent(q.getContent());
        v.setQuestionType(q.getQuestionType().name());
        v.setOptions(q.getOptions());
        v.setPoints(q.getPoints());
        v.setOrderIndex(q.getOrderIndex());
        if (showAnswer) {
            v.setCorrectAnswer(q.getCorrectAnswer());
            v.setExplanation(q.getExplanation());
        }
        return v;
    }

    public QuizAttemptResponse toQuizAttemptResponse(QuizAttempt a, List<Question> questions, boolean showAnswer, Long accountId) {
        QuizAttemptResponse res = new QuizAttemptResponse();
        res.setId(a.getId());
        res.setAccountId(accountId);
        res.setCourseId(a.getCourse().getId());
        res.setResourceId(a.getResource().getId());
        res.setAttemptNumber(a.getAttemptNumber());
        res.setQuestionIds(a.getQuestionIds());
        res.setScore(a.getScore());
        res.setMaxScore(a.getMaxScore());
        res.setPassingScore(a.getPassingScore());
        res.setIsPassed(a.getIsPassed());
        res.setStatus(a.getStatus().name());
        res.setStartedAt(a.getStartedAt());
        res.setSubmittedAt(a.getSubmittedAt());
        res.setTimeSpent(a.getTimeSpent());
        if (questions != null) {
            res.setQuestions(questions.stream().map(q -> toQuizQuestionView(q, showAnswer)).toList());
        }
        if (showAnswer && a.getAnswers() != null) res.setAnswers(a.getAnswers());
        return res;
    }

    // ============================================================
    // 4. PROGRESS
    // ============================================================
    public ProgressResponse toProgressResponse(Progress p, Long accountId) {
        ProgressResponse r = new ProgressResponse();
        r.setId(p.getId());
        r.setAccountId(accountId);
        r.setCourseId(p.getCourse().getId());
        r.setCourseTitle(p.getCourse().getTitle());
        r.setProgressType(p.getProgressType().name());
        r.setReferenceId(p.getReferenceId());
        r.setReferenceType(p.getReferenceType());
        r.setStatus(p.getStatus() != null ? p.getStatus().name() : null);
        r.setProgressPercentage(p.getProgressPercentage());
        r.setTotalTimeSpent(p.getTotalTimeSpent());
        r.setScore(p.getScore());
        r.setMaxScore(p.getMaxScore());
        r.setIsPassed(p.getIsPassed());
        r.setAttempts(p.getAttempts());
        r.setNotes(p.getNotes());
        r.setTotalItems(p.getTotalItems());
        r.setCompletedItems(p.getCompletedItems());
        r.setWeightedScore(p.getWeightedScore());
        r.setTotalWeightPercent(p.getTotalWeightPercent());
        r.setLastAccessedAt(p.getLastAccessedAt());
        r.setStartedAt(p.getStartedAt());
        r.setCompletedAt(p.getCompletedAt());
        r.setHasUncompletedNewContent(p.getHasUncompletedNewContent());
        return r;
    }

    // ============================================================
    // 5. ROOM
    // ============================================================
    public RoomResponse toRoomResponse(Room r) {
        RoomResponse res = new RoomResponse();
        res.setId(r.getId());
        res.setCode(r.getCode());
        res.setName(r.getName());
        res.setCapacity(r.getCapacity());
        res.setLocation(r.getLocation());
        res.setIsActive(r.getIsActive());
        res.setCreatedAt(r.getCreatedAt());
        res.setUpdatedAt(r.getUpdatedAt());
        return res;
    }

    // ============================================================
    // 6. SESSION
    // ============================================================
    public SessionResponse toSessionResponse(Session s) {
        SessionResponse r = new SessionResponse();
        r.setId(s.getId());
        r.setCourseId(s.getCourse().getId());
        r.setSessionNumber(s.getSessionNumber());
        r.setTitle(s.getTitle());
        r.setDescription(s.getDescription());
        r.setStartTime(s.getStartTime());
        r.setEndTime(s.getEndTime());
        r.setSessionDate(s.getSessionDate());

        if (s.getTeacher() != null) {
            r.setTeacherId(s.getTeacher().getId());
            r.setTeacherName(fullNameOf(s.getTeacher()));
        }
        if (s.getSubstituteTeacher() != null) {
            r.setSubstituteTeacherId(s.getSubstituteTeacher().getId());
            r.setSubstituteTeacherName(fullNameOf(s.getSubstituteTeacher()));
        }
        if (s.getAssistant() != null) {
            r.setAssistantId(s.getAssistant().getId());
            r.setAssistantName(fullNameOf(s.getAssistant()));
        }
        if (s.getRoom() != null) {
            r.setRoomId(s.getRoom().getId());
            r.setRoomName(s.getRoom().getName());
        }

        r.setEffectiveTeacherId(s.getEffectiveTeacherId());
        Account effTeacher = s.getSubstituteTeacher() != null ? s.getSubstituteTeacher() : s.getTeacher();
        if (effTeacher != null) r.setEffectiveTeacherName(fullNameOf(effTeacher));

        r.setEffectiveRoomId(s.getEffectiveRoomId());
        Room effRoom = s.getRoom() != null ? s.getRoom() : (s.getCourse() != null ? s.getCourse().getRoom() : null);
        if (effRoom != null) r.setEffectiveRoomName(effRoom.getName());

        r.setStatus(s.getStatus() != null ? s.getStatus().name() : null);
        r.setCancelReason(s.getCancelReason());
        r.setNote(s.getNote());
        r.setRescheduledFromId(s.getRescheduledFromId());
        r.setCreatedAt(s.getCreatedAt());
        r.setUpdatedAt(s.getUpdatedAt());
        return r;
    }

    public SessionScheduleResponse toSessionScheduleResponse(Session s) {
        SessionScheduleResponse r = new SessionScheduleResponse();
        SessionResponse base = toSessionResponse(s);

        r.setId(base.getId());
        r.setCourseId(base.getCourseId());
        r.setSessionNumber(base.getSessionNumber());
        r.setTitle(base.getTitle());
        r.setDescription(base.getDescription());
        r.setStartTime(base.getStartTime());
        r.setEndTime(base.getEndTime());
        r.setSessionDate(base.getSessionDate());
        r.setTeacherId(base.getTeacherId());
        r.setTeacherName(base.getTeacherName());
        r.setAssistantId(base.getAssistantId());
        r.setAssistantName(base.getAssistantName());
        r.setRoomId(base.getRoomId());
        r.setRoomName(base.getRoomName());
        r.setStatus(base.getStatus());
        r.setCancelReason(base.getCancelReason());
        r.setNote(base.getNote());
        r.setRescheduledFromId(base.getRescheduledFromId());
        r.setCreatedAt(base.getCreatedAt());
        r.setUpdatedAt(base.getUpdatedAt());
        r.setSubstituteTeacherId(base.getSubstituteTeacherId());
        r.setSubstituteTeacherName(base.getSubstituteTeacherName());
        r.setEffectiveTeacherId(base.getEffectiveTeacherId());
        r.setEffectiveTeacherName(base.getEffectiveTeacherName());
        r.setEffectiveRoomId(base.getEffectiveRoomId());
        r.setEffectiveRoomName(base.getEffectiveRoomName());

        if (s.getCourse() != null) {
            r.setCourseCode(s.getCourse().getCode());
            r.setCourseTitle(s.getCourse().getTitle());
        }
        return r;
    }

    private static String fullNameOf(Account a) {
        if (a == null) return null;
        return a.getUserProfile() != null ? a.getUserProfile().getFullName() : a.getEmail();
    }
}