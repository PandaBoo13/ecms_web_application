package com.ecms_web_application.OC01.entity;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Setter
@Getter
@EqualsAndHashCode
public class AccountPermissionId implements Serializable {
    private Long account;
    private Long permission;
}