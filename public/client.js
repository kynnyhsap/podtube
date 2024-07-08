const username = "andrew";

let uri = "";

const youtubeLinkInput = document.getElementById("youtube-link-input");
youtubeLinkInput.addEventListener("change", async (e) => {
  uri = e.target.value.trim();
});

const addButton = document.getElementById("add-button");
addButton.addEventListener("click", async () => {
  addButton.innerText = "adding...";

  await fetch("/extract", {
    method: "POST",
    body: JSON.stringify({ uri }),
  });

  addButton.innerText = "✅ added!";
  setTimeout(() => {
    addButton.innerText = "add";
  }, 2000);
});

const copyButton = document.getElementById("copy-button");
copyButton.addEventListener("click", async () => {
  console.log("copying");

  await navigator.clipboard.writeText(
    `${window.location.origin}/rss/${username}`,
  );

  copyButton.innerText = "✅ copied!";

  setTimeout(() => {
    copyButton.innerText = "📋 copy rss";
  }, 2000);
});
