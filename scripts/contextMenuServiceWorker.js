const getKey = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["openai-key"], (result) => {
      if (result["openai-key"]) {
        const decodedKey = atob(result["openai-key"]);
        resolve(decodedKey);
      }
    });
  });
};

const sendMessage = (content) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0].id;

    chrome.tabs.sendMessage(
      activeTab,
      { message: "inject", content },
      (response) => {
        if (response.status === "failed") {
          console.log("injection failed.");
        }
      }
    );
  });
};

const generate = async (prompt) => {
  // Get your API key from storage
  const key = await getKey();
  const url = "https://api.openai.com/v1/completions";

  // Call completions endpoint
  const completionResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "text-davinci-003",
      prompt: prompt,
      temperature: 0.8,
      max_tokens: 150,
      frequency_penalty: 1.5,
    }),
  });

  // Select the top choice and send back
  const completion = await completionResponse.json();
  return completion.choices.pop();
};

const generateCompletionAction = async (info) => {
  try {
    sendMessage("generating genious ideas...");

    const { selectionText } = info;
    const basePromptPrefix = `Concisely list 3 creative, forward-thinking business startup ideas relating to: `;

    const baseCompletion = await generate(
      `${basePromptPrefix}${selectionText}`
    );
    const secondPrompt = `
    Take the 3 innovative business startup ideas below and choose the best, most insightful business idea: generate a professional startup business pitch for this idea: Go deep into why they should invest. Explain how this relates to the title. 
    
    
    Title: ${selectionText}
    
    3 Business Startup Ideas: ${baseCompletion.text}
    

    Professional Pitch:
    `;

    // Call your second prompt
    const secondPromptCompletion = await generate(secondPrompt);
    sendMessage(secondPromptCompletion.text);
    console.log(secondPromptCompletion.text);
  } catch (error) {
    console.log(error);
    sendMessage(error.toString());
  }
};

chrome.contextMenus.create({
  id: "context-run",
  title: "Generate Ideas",
  contexts: ["selection"],
});

chrome.contextMenus.onClicked.addListener(generateCompletionAction);
