import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  FlatList,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import AwesomeAlert from "react-native-awesome-alerts";
import { HeaderButtons, Item } from "react-navigation-header-buttons";

import backgroundImage from "../assets/images/default-wallpaper.jpeg";
import colors from "../constants/colors";
import CustomHeaderButton from "../components/CustomHeaderButton";
import PageContainer from "../components/PageContainer";
import Bubble from "../components/Bubble";
import {
  createChat,
  sendTextMessage,
  sendImage,
} from "../utils/actions/chatActions";
import ReplyTo from "../components/ReplyTo";
import {
  launchImagePicker,
  openCamera,
  uploadImageAsync,
} from "../utils/imagePickerHelper";

const ChatScreen = (props) => {
  const [chatUsers, setChatUsers] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [chatId, setChatId] = useState(props.route?.params?.chatId);
  const [errorBannerText, setErrorBannerText] = useState("");
  const [replyingTo, setReplyingTo] = useState();
  const [tempImageUri, setTempImageUri] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const flatList = useRef();

  const userData = useSelector((state) => state.auth.userData);
  const storedUsers = useSelector((state) => state.users.storedUsers);
  const storedChats = useSelector((state) => state.chats.chatsData);

  const chatMessages = useSelector((state) => {
    if (!chatId) return [];

    const chatMessagesData = state.messages.messagesData[chatId];

    if (!chatMessagesData) return [];

    const messageList = [];
    for (const key in chatMessagesData) {
      const message = chatMessagesData[key];

      messageList.push({
        key,
        ...message,
      });
    }

    return messageList;
  });

  const chatData =
    (chatId && storedChats[chatId]) || props.route?.params?.newChatData || {};

  const getChatTitleFromName = () => {
    const otherUserId = chatUsers.find((uid) => uid !== userData.userId);
    const otherUserData = storedUsers[otherUserId];

    return (
      otherUserData && `${otherUserData.firstName} ${otherUserData.lastName}`
    );
  };

  useEffect(() => {
    if (!chatData) return;

    props.navigation.setOptions({
      headerTitle: chatData.chatName ?? getChatTitleFromName(),
      headerRight: () => {
        return (
          <HeaderButtons HeaderButtonComponent={CustomHeaderButton}>
            {chatId && (
              <Item
                title="Chat settings"
                iconName="ellipsis1"
                onPress={() =>
                  chatData.isGroupChat
                    ? props.navigation.navigate("ChatSettings", { chatId })
                    : props.navigation.navigate("Contact", {
                        uid: chatUsers.find((uid) => uid !== userData.userId),
                      })
                }
              />
            )}
          </HeaderButtons>
        );
      },
    });
    setChatUsers(chatData.users);
  }, [chatUsers]);

  const sendMessage = useCallback(async () => {
    try {
      let id = chatId;
      if (!id) {
        id = await createChat(userData.userId, props.route.params.newChatData);
        setChatId(id);
      }

      await sendTextMessage(
        id,
        userData,
        messageText,
        replyingTo && replyingTo.key,
        chatUsers
      );

      setMessageText("");
      setReplyingTo(null);
    } catch (error) {
      console.log(error);
      setErrorBannerText("Message failed to send");
      setTimeout(() => setErrorBannerText(""), 5000);
    }
  }, [messageText, chatId]);

  const pickImage = useCallback(async () => {
    try {
      const tempUri = await launchImagePicker();
      if (!tempUri) return;

      setTempImageUri(tempUri);
    } catch (error) {
      console.log(error);
    }
  }, [tempImageUri]);

  const takePhoto = useCallback(async () => {
    try {
      const tempUri = await openCamera();
      if (!tempUri) return;

      setTempImageUri(tempUri);
    } catch (error) {
      console.log(error);
    }
  }, [tempImageUri]);

  const uploadImage = useCallback(async () => {
    setIsLoading(true);

    try {
      let id = chatId;
      if (!id) {
        id = await createChat(userData.userId, props.route.params.newChatData);
        setChatId(id);
      }

      const uploadUrl = await uploadImageAsync(tempImageUri, true);
      setIsLoading(false);

      await sendImage(
        id,
        userData,
        uploadUrl,
        replyingTo && replyingTo.key,
        chatUsers
      );
      setReplyingTo(null);

      setTimeout(() => setTempImageUri(""), 500);
    } catch (error) {
      console.log(error);
    }
  }, [isLoading, tempImageUri, chatId]);

  return (
    <SafeAreaView edges={["right", "left", "bottom"]} style={styles.container}>
      <ImageBackground source={backgroundImage} style={styles.backgroundImage}>
        <PageContainer style={{ backgroundColor: "transparent" }}>
          {!chatId && <Bubble text="Start chatting!" type="system" />}

          {errorBannerText !== "" && (
            <Bubble text={errorBannerText} type="error" />
          )}

          {chatId && (
            <FlatList
              ref={(ref) => (flatList.current = ref)}
              onContentSizeChange={() => flatList.current.scrollToEnd()}
              onLayout={() => flatList.current.scrollToEnd({ animated: false })}
              data={chatMessages}
              renderItem={(itemData) => {
                const message = itemData.item;

                const isOwnMessage = message.sentBy === userData.userId;
                let messageType;
                if (message.type && message.type === "info") {
                  messageType = "info";
                } else if (isOwnMessage) {
                  messageType = "myMessage";
                } else {
                  messageType = "theirMessage";
                }

                const sender = message.sentBy && storedUsers[message.sentBy];
                const name = sender && `${sender.firstName} ${sender.lastName}`;

                return (
                  <Bubble
                    type={messageType}
                    text={message.text}
                    messageId={message.key}
                    userId={userData.userId}
                    chatId={chatId}
                    date={message.sentAt}
                    name={
                      !chatData.isGroupChat || isOwnMessage ? undefined : name
                    }
                    setReply={() => setReplyingTo(message)}
                    replyingTo={
                      message.replyTo &&
                      chatMessages.find((i) => i.key === message.replyTo)
                    }
                    imageUrl={message.imageUrl}
                  />
                );
              }}
            />
          )}
        </PageContainer>

        {replyingTo && (
          <ReplyTo
            text={replyingTo.text}
            user={storedUsers[replyingTo.sentBy]}
            onCancel={() => setReplyingTo(null)}
          />
        )}
      </ImageBackground>

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
          <Feather name="plus" size={24} color={colors.blue} />
        </TouchableOpacity>

        <TextInput
          style={styles.textbox}
          value={messageText}
          onChangeText={(text) => setMessageText(text)}
          onSubmitEditing={sendMessage}
        />

        {messageText === "" && (
          <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
            <Feather name="camera" size={24} color={colors.blue} />
          </TouchableOpacity>
        )}

        {messageText !== "" && (
          <TouchableOpacity
            style={{ ...styles.mediaButton, ...styles.sendButton }}
            onPress={sendMessage}
          >
            <Feather name="send" size={20} color={"white"} />
          </TouchableOpacity>
        )}
      </View>

      <AwesomeAlert
        show={tempImageUri !== ""}
        title={`Send to ${getChatTitleFromName()}`}
        closeOnTouchOutside={true}
        closeOnHardwareBackPress={false}
        showCancelButton={!isLoading}
        showConfirmButton={!isLoading}
        cancelText="Cancel"
        confirmText="Send"
        confirmButtonColor={colors.primary}
        cancelButtonColor={colors.lightGrey}
        titleStyle={styles.popupTitleStyle}
        onCancelPressed={() => setTempImageUri("")}
        onConfirmPressed={uploadImage}
        onDismiss={() => setTempImageUri("")}
        customView={
          <View>
            {isLoading && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
            {!isLoading && tempImageUri !== "" && (
              <Image
                source={{ uri: tempImageUri }}
                style={{ width: 200, height: 200 }}
              />
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },
  screen: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    height: 50,
  },
  textbox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 50,
    borderColor: colors.lightGrey,
    marginHorizontal: 15,
    paddingHorizontal: 12,
  },
  mediaButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 35,
  },
  sendButton: {
    backgroundColor: colors.blue,
    borderRadius: 50,
    padding: 8,
  },
  popupTitleStyle: {
    fontFamily: "medium",
    letterSpacing: 0.3,
    color: colors.textColor,
  },
});

export default ChatScreen;
