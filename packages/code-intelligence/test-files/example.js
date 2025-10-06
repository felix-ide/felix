
// JavaScript test file
import React from 'react';
import { useState } from 'react';

export class UserService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async getUser(id) {
    const response = await this.apiClient.get(`/users/${id}`);
    return response.data;
  }
}

const Component = ({ name }) => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Hello {name}</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
};

export default Component;
