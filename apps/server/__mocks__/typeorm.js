// Mock TypeORM decorators and functions
const Entity = () => (target) => target;
const PrimaryColumn = () => (target, propertyName) => {};
const PrimaryGeneratedColumn = () => (target, propertyName) => {};
const Column = () => (target, propertyName) => {};
const CreateDateColumn = () => (target, propertyName) => {};
const UpdateDateColumn = () => (target, propertyName) => {};
const Index = () => (target) => target;
const Unique = () => (target) => target;
const ManyToOne = () => (target, propertyName) => {};
const OneToMany = () => (target, propertyName) => {};
const ManyToMany = () => (target, propertyName) => {};
const JoinTable = () => (target, propertyName) => {};
const JoinColumn = () => (target, propertyName) => {};
const BeforeInsert = () => (target, propertyName) => {};
const BeforeUpdate = () => (target, propertyName) => {};
const AfterInsert = () => (target, propertyName) => {};
const AfterUpdate = () => (target, propertyName) => {};
const AfterLoad = () => (target, propertyName) => {};

class Repository {
  find = jest.fn();
  findOne = jest.fn();
  findOneBy = jest.fn();
  save = jest.fn();
  insert = jest.fn();
  update = jest.fn();
  delete = jest.fn();
  remove = jest.fn();
  count = jest.fn();
  createQueryBuilder = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
    getCount: jest.fn(),
    execute: jest.fn(),
    delete: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
  }));
}

class DataSource {
  constructor(options) {
    this.options = options;
    this.isInitialized = false;
  }
  
  initialize = jest.fn().mockResolvedValue(this);
  destroy = jest.fn().mockResolvedValue(undefined);
  getRepository = jest.fn((entity) => new Repository());
  createQueryRunner = jest.fn(() => ({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    query: jest.fn(),
  }));
  query = jest.fn();
  transaction = jest.fn((cb) => cb({
    getRepository: this.getRepository
  }));
}

class EntityManager {
  find = jest.fn();
  findOne = jest.fn();
  save = jest.fn();
  remove = jest.fn();
  getRepository = jest.fn((entity) => new Repository());
}

const In = jest.fn((values) => ({ _type: 'in', values }));
const Not = jest.fn((value) => ({ _type: 'not', value }));
const IsNull = jest.fn(() => ({ _type: 'isNull' }));
const Like = jest.fn((value) => ({ _type: 'like', value }));
const Between = jest.fn((from, to) => ({ _type: 'between', from, to }));
const LessThan = jest.fn((value) => ({ _type: 'lessThan', value }));
const MoreThan = jest.fn((value) => ({ _type: 'moreThan', value }));

module.exports = {
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
  AfterInsert,
  AfterUpdate,
  AfterLoad,
  Repository,
  DataSource,
  EntityManager,
  In,
  Not,
  IsNull,
  Like,
  Between,
  LessThan,
  MoreThan,
  getRepository: jest.fn((entity) => new Repository()),
  createConnection: jest.fn().mockResolvedValue({
    getRepository: jest.fn((entity) => new Repository()),
    close: jest.fn()
  })
};