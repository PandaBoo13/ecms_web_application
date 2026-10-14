package com.ecms_web_application.OC01.generic;

import org.springframework.stereotype.Component;

import java.util.Iterator;

@Component
public interface IService<T, ID> {
    void save(T t);

    void delete(ID id);

    Iterator<T> findAll();

    T findOne(ID id);

}
