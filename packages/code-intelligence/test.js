
import { BaseService } from './BaseService.js';
import { UserRepository } from './UserRepository.js';

export class UserService extends BaseService {
  constructor(repository) {
    super();
    this.repository = repository;
  }
}