import React from "react";

function ChatBubble({ isUser, name, msg, online }) {
  return (
    <div className={`chat ${isUser ? "chat-end" : "chat-start"}`}>
      <div className={`chat-image avatar  placeholder ${online && "online"}`}>
        <div className="bg-neutral-focus text-neutral-content  w-10 rounded-full">
          <span>
            {name[0]}
            {name.split(" ")?.[1]?.[0] ?? ""}
          </span>
        </div>
      </div>
      <div className="chat-header">{name}</div>
      <div className="chat-bubble">{msg}</div>
    </div>
  );
}

function App() {
  return (
    <div className="flex flex-col mx-auto container max-w-xl center bg-white h-full rounded-lg overflow-hidden">
      <nav className="navbar bg-base-300 px-4">
        <div className="flex-1">
          <a className="normal-case text-xl font-bold font-mono">Chatter Box</a>
        </div>
        <div className="flex-none gap-2">
          <a className="btn btn-sm ">Leave Room</a>
        </div>
      </nav>
      <div className="bg-base-100 text-center text-neutral-focus font-light text-sm italic">
        Joined in room <span className="font-normal text-md mx-2">sdgsdg</span>{" "}
        as <span className="font-bold text-lg mx-2">Jeet</span>
      </div>
      <main className="flex-1 mx-1">
        <ChatBubble
          isUser={false}
          name={"Obi-Wan Kenobi"}
          msg={"You were the Chosen One!"}
          online={false}
        />
        <ChatBubble
          isUser={true}
          name={"Anakin"}
          msg={"I hate you!"}
          online={true}
        />
      </main>
      <div className="navbar bg-base-300">
        <input
          type="text"
          placeholder="Type here"
          className="input input-bordered w-full"
        />
        <button className="btn btn-square m-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default App;
