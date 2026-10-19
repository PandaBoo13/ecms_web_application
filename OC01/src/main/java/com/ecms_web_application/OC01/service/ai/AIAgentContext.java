package com.ecms_web_application.OC01.service.ai;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Context theo từng request AI chat.
 * Dùng ThreadLocal vì Spring AI ChatClient.call() chạy đồng bộ cùng thread.
 * KHÔNG dùng cho async / reactive.
 */
public final class AIAgentContext {

    private static final ThreadLocal<State> HOLDER = ThreadLocal.withInitial(State::new);

    private AIAgentContext() {}

    public static State current() {
        return HOLDER.get();
    }

    public static void reset() {
        HOLDER.remove();
    }

    // ============================================================
    // STATE — mutable, dùng trong suốt 1 lượt chat()
    // ============================================================
    public static final class State {

        private final List<CreatedLead> createdLeads =
                Collections.synchronizedList(new ArrayList<>());

        private String lastToolError;

        /** Tool createLead đã chạy thành công → ghi vào đây. */
        public void recordCreatedLead(Long leadId, String leadName) {
            createdLeads.add(new CreatedLead(leadId, leadName));
            this.lastToolError = null;   // reset lỗi cũ khi vừa thành công
        }

        /** Tool createLead thất bại → lưu lý do. */
        public void recordToolError(String message) {
            this.lastToolError = message;
        }

        public boolean hasCreatedAnyLead() {
            return !createdLeads.isEmpty();
        }

        public List<CreatedLead> getCreatedLeads() {
            return new ArrayList<>(createdLeads);
        }

        public String getLastToolError() {
            return lastToolError;
        }
    }

    public record CreatedLead(Long id, String name) {}
}