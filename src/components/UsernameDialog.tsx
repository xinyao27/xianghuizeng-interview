import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUser } from '@/lib/UserContext';

interface UsernameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsernameDialog({
  isOpen,
  onOpenChange,
}: UsernameDialogProps) {
  const { login, user } = useUser();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
    }
  }, [user]);

  const checkUsernameExists = async (username: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/user/check?username=${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error('Failed to check username');
      }
      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error('Error checking username:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError('Name cannot be empty');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Check if username is taken (if it's not the current user's username)
      if (trimmedUsername !== user?.username) {
        const usernameExists = await checkUsernameExists(trimmedUsername);
        if (usernameExists) {
          setError('Name is already taken');
          setIsLoading(false);
          return;
        }
      }

      await login(trimmedUsername);
      onOpenChange(false);
    } catch (err) {
      setError('Failed to update name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {user ? 'Update Your Name' : 'Enter Your Name'}
            </DialogTitle>
            <DialogDescription>
              {user
                ? 'Change your name below.'
                : 'Please enter a name to continue.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                id="username"
                placeholder="Enter name"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={error ? 'border-red-500' : ''}
                autoComplete="off"
                autoFocus
                disabled={isLoading}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Loading...' : (user ? 'Update' : 'Continue')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
