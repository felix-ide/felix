<?php
class UserService {
    public function getUser($id) {
        return $this->db->find($id);
    }
}