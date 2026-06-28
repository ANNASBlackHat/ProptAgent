'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function TenantInterviewPage() {
  const params = useParams();
  const token = params?.token as string;

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [interviewStatus, setInterviewStatus] = useState('');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [completedScreen, setCompletedScreen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Fetch initial interview details
  useEffect(() => {
    if (!token) return;

    const fetchInterview = async () => {
      try {
        const res = await fetch(`/api/interview/${token}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load interview');
        }

        setApplicantName(data.data.applicantName);
        setPropertyName(data.data.propertyName);
        setUnitNumber(data.data.unitNumber);
        setInterviewStatus(data.data.interviewStatus);
        setMessages(data.data.aiTranscript || []);

        if (data.data.interviewStatus === 'completed') {
          setCompletedScreen(true);
        } else if (data.data.aiTranscript && data.data.aiTranscript.length > 0) {
          // Check if the last assistant message indicated completion
          // In case they refreshed after AI finished but before clicking "Complete"
          const lastMsg = data.data.aiTranscript[data.data.aiTranscript.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content.includes('[INTERVIEW_COMPLETE]')) {
            setIsComplete(true);
          }
        }

        setLoading(false);

        // If no messages yet, trigger the AI's first greeting message
        if (!data.data.aiTranscript || data.data.aiTranscript.length === 0) {
          triggerFirstGreeting();
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
        setLoading(false);
      }
    };

    fetchInterview();
  }, [token]);

  // Automatically trigger the first AI message
  const triggerFirstGreeting = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/interview/${token}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Hi, I'm ready to start the interview." }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages([
          {
            role: 'assistant',
            content: data.data.reply,
            timestamp: new Date().toISOString(),
          }
        ]);
        if (data.data.isComplete) {
          setIsComplete(true);
        }
      }
    } catch (err) {
      console.error('Failed to trigger AI greeting:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending || isComplete || completedScreen) return;

    const userText = inputMessage;
    setInputMessage('');
    setIsSending(true);

    // Optimistically add user message to UI
    const newUserMessage: Message = {
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const res = await fetch(`/api/interview/${token}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send message');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.data.reply,
          timestamp: new Date().toISOString(),
        },
      ]);

      if (data.data.isComplete) {
        setIsComplete(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to get response. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Complete Interview
  const handleCompleteInterview = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/interview/${token}/complete`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete interview');
      }

      setCompletedScreen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to complete. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // ─── Render States ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4" />
        <p className="text-slate-400 text-sm">Loading your interview session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center shadow-xl shadow-purple-950/10">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Interview Unavailable</h3>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <div className="text-xs text-slate-500">
            If you believe this is an error, please contact your landlord.
          </div>
        </div>
      </div>
    );
  }

  if (completedScreen) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center shadow-2xl shadow-purple-950/20">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 mb-3">Interview Completed!</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Thank you, {applicantName}. Your interview responses have been successfully submitted for <strong>{propertyName}</strong> (Unit {unitNumber}).
          </p>
          <p className="text-slate-400 text-xs mb-8">
            The landlord has been notified and will review your application shortly. You may close this tab.
          </p>
          <div className="text-slate-600 text-xs border-t border-slate-800 pt-4">
            Powered by PropAgent AI
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800/80 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-100">Tenant Screening Interview</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {propertyName} · Unit {unitNumber}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">AI Assistant</span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 overflow-y-auto space-y-6 flex flex-col justify-between">
        <div className="space-y-4 flex-1">
          {/* Welcome Message */}
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 text-center text-xs text-slate-400 max-w-lg mx-auto my-4">
            👋 Welcome, <strong className="text-slate-200">{applicantName}</strong>. This chat is your screening interview. Please answer the AI assistant's questions as accurately as possible.
          </div>

          {/* Messages */}
          {messages.map((msg, index) => {
            const isAI = msg.role === 'assistant';
            return (
              <div key={index} className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-fadeIn`}>
                <div className={`flex gap-3 max-w-[85%] ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    isAI ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {isAI ? 'AI' : 'You'}
                  </div>

                  {/* Bubble */}
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${
                    isAI
                      ? 'bg-slate-900 text-slate-200 border border-slate-800'
                      : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-900/10'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className={`block text-[10px] mt-1.5 text-right ${isAI ? 'text-slate-500' : 'text-blue-200'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isSending && (
            <div className="flex justify-start">
              <div className="flex gap-3 flex-row items-center">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  AI
                </div>
                <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-1.5 h-[40px]">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}

          {/* Complete Interview CTA Banner */}
          {isComplete && !completedScreen && (
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 text-center animate-slideUp">
              <h3 className="text-base font-bold text-purple-200 mb-2">🎉 Interview Complete!</h3>
              <p className="text-slate-300 text-xs mb-4">
                The AI assistant has collected all the necessary information. Please click the button below to submit your interview and finalize your application.
              </p>
              <button
                type="button"
                onClick={handleCompleteInterview}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-600/30 active:scale-95"
              >
                Complete Interview & Submit
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Form */}
      <footer className="bg-slate-900/40 border-t border-slate-800/80 p-4 sticky bottom-0 z-10 backdrop-blur-lg">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isSending || isComplete || completedScreen}
              placeholder={
                isComplete
                  ? "Interview complete. Click the button above to submit."
                  : "Type your response here..."
              }
              className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending || isComplete || completedScreen}
              className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg className="w-4 h-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
