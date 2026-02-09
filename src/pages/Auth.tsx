import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

// Helper to send optional welcome email (non-blocking)
const sendWelcomeEmail = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    
    await supabase.functions.invoke("send-welcome-email", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch (err) {
    // Non-blocking - just log and continue
    console.warn("[Auth] Welcome email send failed (non-blocking):", err);
  }
};

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const { signInWithGoogle } = useGoogleAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      let errorTitle = "Sign in failed";
      let errorDescription = error.message;
      
      if (error.message === "Invalid login credentials" || 
          error.message?.includes("Invalid login") ||
          error.message?.includes("invalid_credentials")) {
        errorDescription = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.message?.includes("User not found") || 
                 error.message?.includes("user_not_found")) {
        errorDescription = "This account may not exist. Please sign up or try Google sign-in.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      navigate("/");
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.username);
    setIsLoading(false);

    if (error) {
      const errorLower = error.message.toLowerCase();
      
      // Handle "already registered" - switch to sign in and pre-fill email
      if (errorLower.includes("already registered") || errorLower.includes("user already registered")) {
        toast({
          title: "Email already registered",
          description: "This email already has an account. Please sign in or reset your password.",
        });
        // Switch to sign in mode and pre-fill email
        setIsSignUp(false);
        signInForm.setValue("email", data.email);
        return;
      }
      
      // Handle rate limit errors
      if (errorLower.includes("rate limit") || errorLower.includes("too many requests")) {
        toast({
          title: "Too many attempts",
          description: "Please wait a few minutes before trying again.",
          variant: "destructive",
        });
        return;
      }
      
      // Generic error
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // With email confirmation OFF, user should be auto-signed in
      // Check if we have a session now
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData?.session) {
        // User is signed in - send welcome email (non-blocking) and navigate
        toast({
          title: "Welcome to Whistle!",
          description: "Your account has been created successfully.",
        });
        sendWelcomeEmail(); // Fire and forget
        navigate("/");
      } else {
        // Edge case: no session but signup succeeded - prompt to sign in
        toast({
          title: "Account created!",
          description: "Please sign in to continue.",
        });
        setIsSignUp(false);
        signInForm.setValue("email", data.email);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setIsGoogleLoading(false);

    if (error) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-card animate-fade-in">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-warm">
              <span className="text-2xl font-bold text-primary-foreground">W</span>
            </div>
          </div>
          <CardTitle className="text-2xl">{isSignUp ? "Join Whistle" : "Welcome back"}</CardTitle>
          <CardDescription>
            {isSignUp
              ? "Create an account to start sharing and discovering"
              : "Sign in to your account to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4 gap-2"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative mb-4">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>
          
          {isSignUp ? (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="coolwhistler"
                  {...signUpForm.register("username")}
                  className="bg-secondary/50 border-border/50"
                />
                {signUpForm.formState.errors.username && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...signUpForm.register("email")}
                  className="bg-secondary/50 border-border/50"
                />
                {signUpForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...signUpForm.register("password")}
                  className="bg-secondary/50 border-border/50"
                />
                {signUpForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...signUpForm.register("confirmPassword")}
                  className="bg-secondary/50 border-border/50"
                />
                {signUpForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-warm hover:opacity-90 transition-opacity shadow-glow"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Tip: Use Gmail aliases like <span className="font-mono text-foreground/70">name+test@gmail.com</span> to create multiple test accounts.
              </p>
            </form>
          ) : (
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...signInForm.register("email")}
                  className="bg-secondary/50 border-border/50"
                />
                {signInForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...signInForm.register("password")}
                  className="bg-secondary/50 border-border/50"
                />
                {signInForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-warm hover:opacity-90 transition-opacity shadow-glow"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
              <div className="text-center space-y-2">
                <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary block">
                  Forgot password?
                </Link>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            {isSignUp ? (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
