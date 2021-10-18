import { useEffect, useState, useRef } from 'react';
import { Text } from './rich-content/Text';
import {
  Widget,
  Messenger,
  TitleBar,
  TextWindow,
  MessageListWrapper,
  MessageList,
  InputField,
  TextInput,
  SendIcon,
} from './Styles';
import {Message, APIResponse} from './utilities/types';
import {getAttributes} from './utilities/utils';
import {ChatIcon, CloseIcon} from './utilities/components';
import axios from "axios";

function App({ domElement }: { domElement: Element }) {
  const {
    "chat-title": chatTitle,
    'language-code': languageCode,
    'api-uri': apiURI,
    'chat-icon': chatIcon,
    location
  } = getAttributes(domElement);

  const [open, setOpen] = useState(true);
  const [value, setValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const updateAgentMessage = (response: APIResponse) => {
    setMessages(prevMessages => {
      const messagesCopy = [...prevMessages];

      const {queryResult} = response
      const {text: messageSent = '', responseMessages = []} = queryResult

      let lastAgentIndex = messagesCopy.length - 1;
      while (lastAgentIndex > 0 && messagesCopy[lastAgentIndex].id !== messageSent) lastAgentIndex--;

      if (messagesCopy[lastAgentIndex].id === messageSent) {
        const responseMessage = responseMessages[0]
        const responseText = responseMessage?.text?.text
        messagesCopy[lastAgentIndex].text = responseText[0];
        messagesCopy[lastAgentIndex].id = undefined;
      }

      for (let i = 1; i < responseMessages.length; i++) {
        const message = responseMessages[i];
        const responseText = message?.text?.text
        responseText && messagesCopy.push({type: 'agent', text: responseText[0]})
      }
      return messagesCopy
    })

    scrollToBottom();
  }

  const addUserMessage = async () => {
    const textVal = value
    addMessage({type: 'user', text: textVal})
    addMessage({type: 'agent', text: '...', id: textVal})


    try {
      const addUserMessageResult = await axios.post<string>(apiURI, {
        queryInput: {
          text: {
            text: value
          },
          languageCode: languageCode ?? "en"
        }
      })

      let JSONBeginningIndex = 0
      while (addUserMessageResult.data[JSONBeginningIndex] !== '{') {
        JSONBeginningIndex++
      }
      const responseJSON = JSON.parse(addUserMessageResult.data.substr(JSONBeginningIndex))

      updateAgentMessage(responseJSON)
    } catch (err) {
      console.log(err)
    }

  }

  const addMessage = ({type, text, id}: Message) => {
    setMessages(prevMessages => ([...prevMessages, {type, text, id}]));
    setValue('');
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages.length]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      addUserMessage();
    }
  }

  return (
    <div className="App">
      <Messenger opened={open}>
        <TitleBar>
          {chatTitle}
        </TitleBar>
        <TextWindow>
          <MessageListWrapper>
            <MessageList>
              {messages.map((message, i) => (
                <Text key={i} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </MessageList>
          </MessageListWrapper>
        </TextWindow>
        <InputField>
          <TextInput id="text-input" type='text' value={value} onKeyDown={handleKeyDown} onChange={(event) => setValue(event.target.value)} placeholder="Ask something..." />
          <div onClick={() => addUserMessage()}>
            <SendIcon visible={value.length > 0}>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
            </SendIcon>
          </div>
        </InputField>
      </Messenger>
      <Widget onClick={() => setOpen(!open)}>
        <ChatIcon url={chatIcon} visible={!open} />
          <CloseIcon visible={open} />
      </Widget>
    </div>
  );
}

export default App;
