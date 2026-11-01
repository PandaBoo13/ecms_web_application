package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.config.FlexibleLocalDateTimeDeserializer;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Lớp đại diện cho một tương tác trong danh sách tương tác của Lead (lưu dưới dạng jsonb trong bảng leads).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class LeadInteraction implements Serializable {

    private Long id;

    private Long leadId;

    @JsonProperty("interactionType")
    @JsonAlias({"type", "interaction_type"})
    private String interactionType;

    @JsonProperty("notes")
    @JsonAlias({"note", "notes"})
    private String notes;

    @JsonProperty("result")
    private String result;

    @JsonProperty("rejectReason")
    @JsonAlias({"reject_reason"})
    private String rejectReason;

    @JsonProperty("performedBy")
    @JsonAlias({"consultant_id", "performed_by"})
    private Long performedBy;

    @JsonProperty("channel")
    private String channel;

    @JsonProperty("createdAt")
    @JsonAlias({"date", "created_at"})
    @JsonDeserialize(using = FlexibleLocalDateTimeDeserializer.class)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
