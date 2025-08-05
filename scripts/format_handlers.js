// Format question function
const handleFormatQuestion = () => {
  if (typeof formatAnswer !== "function") {
    console.error("formatAnswer is not a function:", typeof formatAnswer);
    alert("formatAnswer function is not available");
    return;
  }
  
  if (!editQuestion || !editQuestion.trim()) {
    console.log("❌ Current question is empty");
    alert("Error: Question field is empty");
    return;
  }
  
  const formatted = formatAnswer(editQuestion);
  setEditQuestion(formatted);
  
  if (editQuestionRef.current) {
    editQuestionRef.current.focus();
  }
  
  console.log("✅ formatAnswer completed for question, result length:", formatted?.length);
};

// Format answer function
const handleFormatAnswer = () => {
  if (typeof formatAnswer !== "function") {
    console.error("formatAnswer is not a function:", typeof formatAnswer);
    alert("formatAnswer function is not available");
    return;
  }
  
  if (!editAnswer || !editAnswer.trim()) {
    console.log("❌ Current answer is empty");
    alert("Error: Answer field is empty");
    return;
  }
  
  const formatted = formatAnswer(editAnswer);
  setEditAnswer(formatted);
  
  if (editAnswerRef.current) {
    editAnswerRef.current.focus();
  }
  
  console.log("✅ formatAnswer completed for answer, result length:", formatted?.length);
};
