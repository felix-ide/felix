package com.example.service;

import com.example.model.User;

public class UserService extends BaseService implements Printable {
    public String display(User u) {
        return format(u.getId() + ":" + u.getName());
    }
}

