import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Target, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuthProps {
  onAuthSuccess?: () => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const client = await getSupabase();
      if (!client) {
        toast({
          title: 'Configuration Error',
          description: 'Supabase is not configured. Please check your environment variables.',
          variant: 'destructive',
        });
        return;
      }

      if (isLogin) {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in.',
        });
      } else {
        const { error } = await client.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: 'Account created!',
          description: 'Check your email to confirm your account.',
        });
      }
      onAuthSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Authentication failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background" data-testid="auth-container">
      <Card className="w-full max-w-md border-border/50" data-testid="card-auth">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center" data-testid="auth-logo">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold" data-testid="text-auth-title">Sub3VT</CardTitle>
            <CardDescription className="text-muted-foreground" data-testid="text-auth-description">
              Your marathon training companion
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="runner@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="button-auth-submit"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              data-testid="button-toggle-auth-mode"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
