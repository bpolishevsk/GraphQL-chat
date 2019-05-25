import Joi from '@hapi/joi'
import { UserInputError } from 'apollo-server-express'
import { startChat } from '../validators'
import { User, Chat, Message } from '../models'
import { Request, ChatDocument, UserDocument, MessageDocument } from '../types'

export default {
  Mutation: {
    startChat: async (
      root: object,
      args: { title: string; userIds: [string] },
      { req }: { req: Request }
    ): Promise<ChatDocument> => {
      const { userId } = req.session
      const { title, userIds } = args

      await Joi.validate(args, startChat(userId), { abortEarly: false })

      const idsFound = await User.where('_id')
        .in(userIds)
        .countDocuments()

      if (idsFound !== userIds.length) {
        throw new UserInputError('One or more User IDs are invalid.')
      }

      userIds.push(userId)

      // TODO: should not be able to create a chat if already exists
      const chat = await Chat.create({ title, users: userIds })

      await User.updateMany(
        { _id: { $in: userIds } },
        {
          $push: { chats: chat }
        }
      )

      return chat
    }
  },
  Chat: {
    messages: (chat: ChatDocument): Promise<MessageDocument[]> => {
      // TODO: pagination, projection
      return Message.find({ chat: chat.id }).exec()
    },
    users: async (chat: ChatDocument): Promise<UserDocument[]> => {
      return (await chat.populate('users').execPopulate()).users
    },
    lastMessage: async (chat: ChatDocument): Promise<MessageDocument> => {
      return (await chat.populate('lastMessage').execPopulate()).lastMessage
    }
  }
}
