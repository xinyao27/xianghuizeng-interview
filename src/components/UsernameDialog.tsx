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

interface UsernameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (username: string) => void;
  title?: string;
  description?: string;
  defaultUsername?: string;
}

export function UsernameDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  title = 'Enter Your Username',
  description = 'Please enter a username to continue.',
  defaultUsername = '',
}: UsernameDialogProps) {
  const [username, setUsername] = useState(defaultUsername);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUsername(defaultUsername);
      setError('');
    }
  }, [isOpen, defaultUsername]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Username cannot be empty');
      return;
    }
    if (trimmedUsername === defaultUsername) {
      onOpenChange(false);
      return;
    }
    setError('');
    onSubmit(trimmedUsername);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                id="username"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={error ? 'border-red-500' : ''}
                autoComplete="off"
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {defaultUsername ? 'Update' : 'Continue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
