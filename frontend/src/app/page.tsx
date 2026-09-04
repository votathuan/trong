"use client";

import React, { useState } from "react";

interface Question {
  id: number;
  question: string;
  options: string[];
  answer_index: number;
}

export default function Home() {
  const [quizData, setQuizData] = useState<Question[] | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      setError(null);
      const file = e.target.files[0];
      
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        const res = await fetch(`${API_URL}/api/upload-pdf`, {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) {
          throw new Error(`Error: ${res.statusText}`);
        }
        
        const data = await res.json();
        if (data.success && data.data) {
          setQuizData(data.data);
        } else {
          throw new Error("Failed to parse PDF");
        }
      } catch (err: any) {
        setError(err.message || "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSelectAnswer = (questionId: number, optIndex: number) => {
    if (userAnswers[questionId] !== undefined) return; // already answered
    setUserAnswers((prev) => ({ ...prev, [questionId]: optIndex }));
  };

  const handleSubmit = () => {
    if (!quizData) return;
    let correctCount = 0;
    quizData.forEach((q) => {
      if (userAnswers[q.id] === q.answer_index) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white">
          <h1 className="text-3xl font-extrabold tracking-tight">AI Quiz AutoGrader</h1>
          <p className="opacity-90 mt-2 text-indigo-100 text-lg">Upload đề thi PDF. Làm bài. Nhận điểm ngay.</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {error}
            </div>
          )}

          {!quizData && (
            <div className="border-3 border-dashed border-indigo-200 rounded-2xl p-16 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300">
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="pdf-upload" 
              />
              <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-4"></div>
                ) : (
                  <svg className="w-20 h-20 text-indigo-400 mb-4 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                )}
                <span className="text-xl font-bold text-slate-700">
                  {isLoading ? "Đang phân tích PDF bằng AI..." : "Click để tải lên đề thi PDF của bạn"}
                </span>
                <span className="text-slate-500 mt-2 font-medium">Hệ thống sẽ tự động tìm các đáp án bị bôi màu</span>
              </label>
            </div>
          )}

          {quizData && (
            <div className="space-y-8 animate-fade-in-up">
              {isSubmitted && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center shadow-inner">
                  <h2 className="text-2xl font-bold text-emerald-800">Kết quả bài làm</h2>
                  <div className="text-5xl font-black text-emerald-600 mt-3 flex justify-center items-baseline gap-2">
                    {score} <span className="text-2xl text-emerald-500 font-bold">/ {quizData.length}</span>
                  </div>
                </div>
              )}

              {quizData.map((q, qIndex) => (
                <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-800 mb-5 flex gap-2">
                    <span className="text-indigo-600">Câu {qIndex + 1}:</span> 
                    {q.question.replace(/^Câu \d+:\s*/i, '')}
                  </h3>
                  
                  <div className="space-y-3">
                    {q.options.map((opt, idx) => {
                      const hasAnswered = userAnswers[q.id] !== undefined;
                      const isSelected = userAnswers[q.id] === idx;
                      const isCorrect = q.answer_index === idx;
                      
                      let btnClass = "w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 font-medium text-lg ";
                      
                      if (!hasAnswered) {
                        btnClass += isSelected 
                          ? "border-indigo-600 bg-indigo-50 text-indigo-800 shadow-sm" 
                          : "border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-white text-slate-700";
                      } else {
                        if (isCorrect) {
                          btnClass += "border-emerald-500 bg-emerald-50 text-emerald-800";
                        } else if (isSelected && !isCorrect) {
                          btnClass += "border-rose-500 bg-rose-50 text-rose-800";
                        } else {
                          btnClass += "border-slate-100 bg-slate-50 text-slate-400 opacity-60";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectAnswer(q.id, idx)}
                          disabled={hasAnswered}
                          className={btnClass}
                        >
                          <div className="flex justify-between items-center">
                            <span>{opt}</span>
                            {hasAnswered && isCorrect && (
                              <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            )}
                            {hasAnswered && isSelected && !isCorrect && (
                              <svg className="w-7 h-7 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {!isSubmitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={Object.keys(userAnswers).length !== quizData.length}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                  Nộp Bài Chấm Điểm
                </button>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-xl shadow-lg transition-all active:scale-95"
                >
                  Tải Lại PDF Khác
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
