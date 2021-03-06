import Relay from 'react-relay';

export default class AddMessageMutation extends Relay.Mutation {
  static fragments = {
    thread: () => Relay.QL`
      fragment on Thread {
        id,
        isRead,
        lastUpdated
      }
    `,
    viewer: () => Relay.QL`
      fragment on User {
        id,
        threads(first: 9007199254740991) {
          unreadCount,
          edges {
            node {
              id
            }
          }
        },
      }
    `,
  };
  getMutation() {
    return Relay.QL`mutation{addMessage}`;
  }
  getFatQuery() {
    return Relay.QL`
      fragment on AddMessagePayload {
        messageEdge,
        thread {
          isRead,
          lastUpdated
        },
        viewer {
          threads(first: 9007199254740991) {
            unreadCount,
            edges {
              node {
                id
              }
            }
          },
        },
      }
    `;
  }
  getConfigs() {
    return [{
      // use FIELDS_CHANGE here to make unreadCount and thread order changeed
      // 用 FIELDS_CHANGE 來讓新增訊息時，左邊thread的順序和unreadCount都會跟著動
      type: 'FIELDS_CHANGE',
      fieldIDs: {
        thread: this.props.thread.id,
        viewer: this.props.viewer.id,
      },
    },
    {
      type: 'RANGE_ADD',
      parentName: 'thread',
      parentID: this.props.thread.id,
      connectionName: 'messages',
      edgeName: 'messageEdge',
      rangeBehaviors: {
        '': 'append',
      },
    }];
  }
  getVariables() {
    return {
      text: this.props.text,
      id: this.props.thread.id
    };
  }
  getOptimisticResponse() {
    console.log(this.props);
    let viewerPayload;
    const {id, threads} = this.props.viewer;
    const {unreadCount} = threads;
    if (threads) {
      viewerPayload = {id: id, threads: {}};
      if (unreadCount != null) {
        viewerPayload.threads.unreadCount = unreadCount > 0 ?
          !this.props.thread.isRead ? unreadCount - 1 : unreadCount
          : 0;
  // make sure no double decrementing on same thread and no minus unreadCount
  // 確保同一個thread不會因為按兩次, unreadCount又被-1一次, 還有不會有負的unreadCount
  // copied from MarkThreadAsReadMutation, see if we can do something better
      }
    }
    let timestamp = Date.now();
    return {
      messageEdge: {
        node: {
          id: 'm_' + timestamp,
          authorName: 'me', // hard coded for the example
          timestamp: timestamp,
          text: this.props.text,
        },
      },
      thread: {
        id: this.props.thread.id,
        isRead: true,
        lastUpdated: timestamp
      },
      viewer: viewerPayload
    };
  }
}
