'use client';

import React, { useState, useEffect, useCallback } from 'react';

// Type definitions following TypeScript best practices
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

interface TestComponentProps {
  title?: string;
  initialUsers?: User[];
  onUserSelect?: (user: User) => void;
  className?: string;
}

// Custom hook for managing user state
const useUserManagement = (initialUsers: User[] = []) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const addUser = useCallback((newUser: Omit<User, 'id'>) => {
    const user: User = {
      ...newUser,
      id: Date.now(), // Simple ID generation for demo
    };
    setUsers(prev => [...prev, user]);
  }, []);

  const toggleUserStatus = useCallback((userId: number) => {
    setUsers(prev => 
      prev.map(user => 
        user.id === userId 
          ? { ...user, isActive: !user.isActive }
          : user
      )
    );
  }, []);

  return {
    users,
    selectedUser,
    setSelectedUser,
    loading,
    setLoading,
    addUser,
    toggleUserStatus,
  };
};

/**
 * TestComponent - A demonstration component showcasing modern TypeScript + React patterns
 * 
 * Features:
 * - Type-safe props and state management
 * - Custom hooks for business logic separation
 * - Modern ES6+ syntax and patterns
 * - Responsive design considerations
 * - Error boundary compatibility
 */
const TestComponent: React.FC<TestComponentProps> = ({
  title = 'User Management Test Component',
  initialUsers = [],
  onUserSelect,
  className = '',
}) => {
  const {
    users,
    selectedUser,
    setSelectedUser,
    loading,
    setLoading,
    addUser,
    toggleUserStatus,
  } = useUserManagement(initialUsers);

  // Simulate API call effect
  useEffect(() => {
    if (initialUsers.length === 0) {
      setLoading(true);
      
      // Simulate API delay
      const timer = setTimeout(() => {
        const mockUsers: User[] = [
          { id: 1, name: 'John Doe', email: 'john@example.com', isActive: true },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', isActive: false },
          { id: 3, name: 'Bob Johnson', email: 'bob@example.com', isActive: true },
        ];
        
        mockUsers.forEach(user => addUser(user));
        setLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [initialUsers.length, addUser, setLoading]);

  const handleUserClick = useCallback((user: User) => {
    setSelectedUser(user);
    onUserSelect?.(user);
  }, [setSelectedUser, onUserSelect]);

  const handleAddNewUser = useCallback(() => {
    const name = prompt('Enter user name:');
    const email = prompt('Enter user email:');
    
    if (name && email) {
      addUser({
        name: name.trim(),
        email: email.trim(),
        isActive: true,
      });
    }
  }, [addUser]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600">
          Demonstrating TypeScript + Next.js best practices
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* User List Section */}
        <section className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Users ({users.length})
            </h3>
            <button
              onClick={handleAddNewUser}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              type="button"
            >
              Add User
            </button>
          </div>

          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className={`p-3 border rounded-md cursor-pointer transition-all duration-200 ${
                  selectedUser?.id === user.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleUserClick(user)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleUserClick(user);
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleUserStatus(user.id);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      type="button"
                    >
                      Toggle
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Selected User Details */}
        <aside className="flex-1 lg:max-w-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Selected User Details
          </h3>
          
          {selectedUser ? (
            <div className="bg-gray-50 rounded-md p-4">
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">ID</dt>
                  <dd className="text-gray-800">{selectedUser.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-gray-800">{selectedUser.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-gray-800">{selectedUser.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd>
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        selectedUser.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="text-gray-500 italic">
              Select a user to view details
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default TestComponent;

// Export types for external usage
export type { User, TestComponentProps };
