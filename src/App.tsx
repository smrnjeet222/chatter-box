import {
  createClient,
  RealtimeChannel,
  REALTIME_LISTEN_TYPES,
  REALTIME_PRESENCE_LISTEN_EVENTS,
  REALTIME_SUBSCRIBE_STATES,
} from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { VariableSizeList, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import useLocalStorageState from "use-local-storage-state";
const createChatCode = customAlphabet("ABCDEFGHIJKLMNOP123456789", 6);

const client = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
  {
    realtime: { params: { eventsPerSecond: 20000 } },
  }
);

interface ChatMessage {
  id: string;
  message: string;
  username: string;
}

interface PresenceMessage {
  id: string;
  action: "join" | "leave";
  username: string;
}

type Message = ChatMessage | PresenceMessage;

function isChatMessage(value: any): value is ChatMessage {
  return !!value.message;
}

function App() {
  const [channel, setChannel] = useState<RealtimeChannel>();
  const [messages, setMessages] = useState<Message[]>([]);

  const [users, setUsers] = useState<Set<string>>(new Set([]));
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("room");
  const listRef = useRef<any>();
  const [username, setUsername] = useLocalStorageState<string>(
    `${roomCode}-chat-username`
  );
  const nav = useNavigate();

  useEffect(() => {
    if (!roomCode) {
      nav({ pathname: "/", search: `?room=${createChatCode()}` });
    }
  }, [roomCode]);

  useEffect(() => {
    if (roomCode && username) {
      const channel = client.channel(`room:${roomCode}`, {
        config: {
          broadcast: {
            self: true,
          },
          presence: {
            key: username,
          },
        },
      });
      channel.on(
        REALTIME_LISTEN_TYPES.PRESENCE,
        { event: REALTIME_PRESENCE_LISTEN_EVENTS.SYNC },
        () => {
          setUsers(new Set(Object.keys(channel.presenceState())));
        }
      );
      channel.on(
        REALTIME_LISTEN_TYPES.PRESENCE,
        { event: REALTIME_PRESENCE_LISTEN_EVENTS.JOIN },
        ({ newPresences }) => {
          const presenceMsg = newPresences.map(({ username }) => {
            return {
              action: "join" as const,
              username,
              id: createChatCode(),
            };
          });
          setMessages((messages) => [...messages, ...presenceMsg]);
        }
      );
      channel.on(
        REALTIME_LISTEN_TYPES.PRESENCE,
        { event: REALTIME_PRESENCE_LISTEN_EVENTS.LEAVE },
        ({ leftPresences }) => {
          const presenceMsg = leftPresences.map(({ username }) => {
            return {
              action: "leave" as const,
              username,
              id: createChatCode(),
            };
          });
          setMessages((messages) => [...messages, ...presenceMsg]);
        }
      );
      channel.subscribe(async (status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          channel.track({ username });
        }
      });
      channel.on(
        REALTIME_LISTEN_TYPES.BROADCAST,
        { event: "message" },
        ({ payload }) => {
          setMessages((messages) => [...messages, payload]);
        }
      );
      setChannel(channel);
      return () => {
        setChannel(undefined);
        channel.unsubscribe();
      };
    }
  }, [roomCode, username]);

  useEffect(() => {
    function handleResize() {
      listRef.current?.resetAfterIndex(0, true);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollToItem(messages.length);
  }, [messages.length]);

  const leaveRoom = () => {
    setUsername("");
    setMessages([]);
    nav({ pathname: "/", search: `?room=${roomCode}` });
  };

  if (!username || !roomCode) return <Entry setUsername={setUsername} />;

  return (
    <div className="flex flex-col mx-auto container max-w-xl center bg-white h-full rounded-lg overflow-hidden">
      <Navbar roomCode={roomCode} username={username} leaveRoom={leaveRoom} />
      <main className="flex-1 m-2">
        <AutoSizer>
          {({ height, width }) => {
            return (
              <VariableSizeList
                ref={listRef}
                height={height}
                width={width}
                itemSize={(index) => {
                  const message = messages[index];
                  if (isChatMessage(message)) {
                    // there must be a better way to get the real height of message
                    const rows = Math.ceil(
                      message.message.length / (width / 10)
                    );
                    return 80 + 28 * (rows - 1);
                  }
                  return 24;
                }}
                itemCount={messages.length}
                itemData={messages}
                initialScrollOffset={100000000}
              >
                {(e) =>
                  MessageRow({
                    ...e,
                    users,
                    isUser: e.data[e.index].username === username,
                  })
                }
              </VariableSizeList>
            );
          }}
        </AutoSizer>
      </main>
      <InputBox
        focus={!!username}
        onMessage={(message: string) => {
          channel?.send({
            type: "broadcast",
            event: "message",
            payload: {
              message,
              username,
              id: createChatCode(),
            },
          });
        }}
      />
    </div>
  );
}

function ChatBubble({ isUser, name, msg, online }) {
  return (
    <div className={`chat ${isUser ? "chat-end mr-2" : "chat-start"}`}>
      <div className={`chat-image avatar placeholder ${online && "online"}`}>
        <div
          className={`${
            isUser
              ? "bg-base-200 text-neutral-focus"
              : "bg-neutral-focus text-neutral-content"
          }  w-10 rounded-full`}
        >
          <span>
            {name[0]?.toUpperCase()}
            {name.split(" ")?.[1]?.[0]?.toUpperCase() ?? ""}
          </span>
        </div>
      </div>
      <div className="chat-header">{name}</div>
      <div
        className={`chat-bubble ${isUser && "bg-base-200 text-neutral-focus"}`}
      >
        {msg}
      </div>
    </div>
  );
}

function Navbar({ roomCode, username, leaveRoom }) {
  return (
    <>
      <nav className="navbar bg-base-300 px-4">
        <div className="flex-1">
          <a className="text-xl font-bold font-mono">Chatter Box</a>
        </div>
        <div className="flex-none gap-2">
          <a className="btn btn-sm" onClick={leaveRoom}>
            Leave Room
          </a>
        </div>
      </nav>
      <div className="bg-base-100 text-center text-base-content font-light text-sm italic">
        Joined in room
        <span className="font-normal text-md mx-2">{roomCode ?? "___"}</span>
        as <span className="font-bold text-lg mx-2">{username ?? "___"}</span>
      </div>
    </>
  );
}

function MessageRow(
  props: ListChildComponentProps & { users: Set<string>; isUser: boolean }
) {
  const { index, style, data } = props;
  const message = data[index];

  if (isChatMessage(message)) {
    return (
      <div style={style} id={message.id} key={message.id}>
        <ChatBubble
          isUser={props.isUser}
          name={message.username}
          msg={message.message}
          online={props.users.has(message.username)}
        />
      </div>
    );
  }

  return (
    <div style={style} id={message.id} key={message.id}>
      <p
        className={`text-center font-thin italic text-sm my-1 ${
          message.action === "join" ? "text-green-700" : "text-red-500"
        }`}
      >
        <span className="font-normal ">{message.username}</span>
        {message.action === "join" ? " joined " : " left "}
        the room
      </p>
    </div>
  );
}

function InputBox({ onMessage, focus }: { onMessage: any; focus: boolean }) {
  const [input, setInput] = useState("");
  return (
    <div className="navbar bg-base-300">
      <input
        type="text"
        placeholder="Type here"
        className="input input-bordered w-full"
        value={input}
        autoFocus={focus}
        onChange={(e) => {
          setInput(e.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            if (input) {
              setInput("");
              onMessage(input);
            }
            event.preventDefault();
            return false;
          }
        }}
      />
      <button
        className="btn btn-square m-1"
        onClick={() => {
          if (input) {
            setInput("");
            onMessage(input);
          }
        }}
      >
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
  );
}

function Entry({ setUsername }) {
  const [usernameInput, setUsernameInput] = useState("");

  return (
    <div className="mx-auto container max-w-xl center bg-white rounded-lg overflow-hidden">
      <div className="card  bg-white text-primary-content">
        <div className="card-body">
          <h2 className="card-title text-3xl font-bold font-mono mb-6">
            Chatter Box
          </h2>
          <p>To join this chat room please enter your username?</p>
          <input
            type="text"
            placeholder="Enter Username"
            className="input input-sm input-bordered w-full"
            value={usernameInput}
            onChange={(event) => {
              setUsernameInput(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                if (usernameInput) {
                  setUsername(usernameInput);
                }
              }
            }}
          />
          <div className="card-actions justify-center">
            <button
              className="btn btn-sm mt-6"
              onClick={() => {
                if (usernameInput) {
                  setUsername(usernameInput);
                }
              }}
            >
              Enter Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
