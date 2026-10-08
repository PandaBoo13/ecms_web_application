package com.ecms_web_application.OC01.dto.response.rbac;

import lombok.Getter;
import lombok.Setter;

/**
 * Role của 1 account.
 */
@Setter
@Getter
public class AccountRoleResponse {

    private Long roleId;
    private String code;
    private String description;
}