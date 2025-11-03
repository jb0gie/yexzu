import { css } from '@firebolt-dev/css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronUpIcon, LoaderIcon, MessageSquareTextIcon, RefreshCwIcon, SendHorizonalIcon } from 'lucide-react'
import moment from 'moment'

import { AvatarPane } from './AvatarPane'
import { useElemSize } from './useElemSize'
import { MouseLeftIcon } from './MouseLeftIcon'
import { MouseRightIcon } from './MouseRightIcon'
import { MouseWheelIcon } from './MouseWheelIcon'
import { buttons, propToLabel } from '../../core/extras/buttons'
import { cls, isTouch } from '../utils'
import { uuid } from '../../core/utils'
import { ControlPriorities } from '../../core/extras/ControlPriorities'
// import { AppsPane } from './AppsPane'
// import { MenuMain } from './MenuMain'
// import { MenuApp } from './MenuApp'
import { ChevronDoubleUpIcon, HandIcon } from './Icons'

// Simple camera icon for the camera toggle button
function CameraIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z'
        fill='currentColor'
      />
      <path
        d='M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z'
        fill='currentColor'
      />
    </svg>
  )
}
import { Sidebar } from './Sidebar'

export function CoreUI({ world }) {
  const ref = useRef()
  const [ready, setReady] = useState(false)
  const [player, setPlayer] = useState(() => world.entities.player)
  const [ui, setUI] = useState(world.ui.state)
  const [menu, setMenu] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [code, setCode] = useState(false)
  const [avatar, setAvatar] = useState(null)
  const [disconnected, setDisconnected] = useState(false)
  const [apps, setApps] = useState(false)
  const [kicked, setKicked] = useState(null)
  useEffect(() => {
    world.on('ready', setReady)
    world.on('player', setPlayer)
    world.on('ui', setUI)
    world.on('menu', setMenu)
    world.on('confirm', setConfirm)
    world.on('code', setCode)
    world.on('apps', setApps)
    world.on('avatar', setAvatar)
    world.on('kick', setKicked)
    world.on('disconnect', setDisconnected)
    return () => {
      world.off('ready', setReady)
      world.off('player', setPlayer)
      world.off('ui', setUI)
      world.off('menu', setMenu)
      world.off('confirm', setConfirm)
      world.off('code', setCode)
      world.off('apps', setApps)
      world.off('avatar', setAvatar)
      world.off('kick', setKicked)
      world.off('disconnect', setDisconnected)
    }
  }, [])

  useEffect(() => {
    const elem = ref.current
    const onEvent = e => {
      e.isCoreUI = true
    }
    elem.addEventListener('wheel', onEvent)
    elem.addEventListener('click', onEvent)
    elem.addEventListener('pointerdown', onEvent)
    elem.addEventListener('pointermove', onEvent)
    elem.addEventListener('pointerup', onEvent)
    elem.addEventListener('touchstart', onEvent)
    // elem.addEventListener('touchmove', onEvent)
    // elem.addEventListener('touchend', onEvent)
  }, [])
  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * world.prefs.ui}px`
    function onChange(changes) {
      if (changes.ui) {
        document.documentElement.style.fontSize = `${16 * world.prefs.ui}px`
      }
    }
    world.prefs.on('change', onChange)
    return () => {
      world.prefs.off('change', onChange)
    }
  }, [])
  return (
    <div
      ref={ref}
      className='coreui'
      css={css`
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
      `}
    >
      {disconnected && <Disconnected />}
      {!ui.reticleSuppressors && <Reticle world={world} />}
      {<Toast world={world} />}
      {ready && <ActionsBlock world={world} />}
      {ready && <Sidebar world={world} ui={ui} />}
      {ready && <Chat world={world} />}
      {/* {ready && <Side world={world} player={player} menu={menu} />} */}
      {avatar && <AvatarPane key={avatar.hash} world={world} info={avatar} />}
      {/* {apps && <AppsPane world={world} close={() => world.ui.toggleApps()} />} */}
      {!ready && <LoadingOverlay world={world} />}
      {kicked && <KickedOverlay code={kicked} />}
      {ready && isTouch && <TouchBtns world={world} />}
      {ready && isTouch && <TouchStick world={world} />}
      {confirm && <Confirm options={confirm} />}
      <div id='core-ui-portal' />
    </div>
  )
}

// function Side({ world, menu }) {
//   const inputRef = useRef()
//   const [msg, setMsg] = useState('')
//   const [chat, setChat] = useState(false)
//   const [livekit, setLiveKit] = useState(() => world.livekit.status)
//   const [actions, setActions] = useState(() => world.prefs.actions)
//   useEffect(() => {
//     const onPrefsChange = changes => {
//       if (changes.actions) setActions(changes.actions.value)
//     }
//     const onLiveKitStatus = status => {
//       setLiveKit({ ...status })
//     }
//     world.livekit.on('status', onLiveKitStatus)
//     world.prefs.on('change', onPrefsChange)
//     return () => {
//       world.prefs.off('change', onPrefsChange)
//       world.livekit.off('status', onLiveKitStatus)
//     }
//   }, [])
//   useEffect(() => {
//     const control = world.controls.bind({ priority: ControlPriorities.CORE_UI })
//     control.slash.onPress = () => {
//       if (!chat) setChat(true)
//     }
//     control.enter.onPress = () => {
//       if (!chat) setChat(true)
//     }
//     control.mouseLeft.onPress = () => {
//       if (control.pointer.locked && chat) {
//         setChat(false)
//       }
//     }
//     return () => control.release()
//   }, [chat])
//   useEffect(() => {
//     if (chat) {
//       inputRef.current.focus()
//     } else {
//       inputRef.current.blur()
//     }
//   }, [chat])
//   const send = async e => {
//     if (world.controls.pointer.locked) {
//       setTimeout(() => setChat(false), 10)
//     }
//     if (!msg) {
//       e.preventDefault()
//       return setChat(false)
//     }
//     setMsg('')
//     // check for commands
//     if (msg.startsWith('/')) {
//       world.chat.command(msg)
//       return
//     }
//     // otherwise post it
//     const player = world.entities.player
//     const data = {
//       id: uuid(),
//       from: player.data.name,
//       fromId: player.data.id,
//       body: msg,
//       createdAt: moment().toISOString(),
//     }
//     world.chat.add(data, true)
//     if (isTouch) {
//       e.target.blur()
//       // setTimeout(() => setChat(false), 10)
//     }
//   }
//   return (
//     <div
//       className='side'
//       css={css`
//         position: absolute;
//         top: calc(4rem + env(safe-area-inset-top));
//         left: calc(4rem + env(safe-area-inset-left));
//         bottom: calc(4rem + env(safe-area-inset-bottom));
//         right: calc(4rem + env(safe-area-inset-right));
//         display: flex;
//         align-items: stretch;
//         font-size: 1rem;
//         .side-content {
//           max-width: 21rem;
//           width: 100%;
//           display: flex;
//           flex-direction: column;
//           align-items: stretch;
//         }
//         .side-btns {
//           display: flex;
//           align-items: center;
//           margin-left: -0.5rem;
//         }
//         .side-btn {
//           pointer-events: auto;
//           /* margin-bottom: 1rem; */
//           width: 2.5rem;
//           height: 2.5rem;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           cursor: pointer;
//           svg {
//             filter: drop-shadow(0 0.0625rem 0.125rem rgba(0, 0, 0, 0.2));
//           }
//         }
//         .side-mid {
//           flex: 1;
//           display: flex;
//           flex-direction: column;
//           justify-content: center;
//         }
//         .side-chatbox {
//           margin-top: 0.5rem;
//           background: rgba(0, 0, 0, 0.3);
//           padding: 0.625rem;
//           display: flex;
//           align-items: center;
//           opacity: 0;
//           &.active {
//             opacity: 1;
//             pointer-events: auto;
//           }
//           &-input {
//             flex: 1;
//             /* paint-order: stroke fill; */
//             /* -webkit-text-stroke: 0.25rem rgba(0, 0, 0, 0.2); */
//             &::placeholder {
//               color: rgba(255, 255, 255, 0.5);
//             }
//           }
//         }
//         @media all and (max-width: 700px), (max-height: 700px) {
//           top: calc(1.5rem + env(safe-area-inset-top));
//           left: calc(1.5rem + env(safe-area-inset-left));
//           bottom: calc(1.5rem + env(safe-area-inset-bottom));
//           right: calc(1.5rem + env(safe-area-inset-right));
//         }
//       `}
//     >
//       <div className='side-content'>
//         <div className='side-btns'>
//           <div className='side-btn' onClick={() => world.ui.toggleMain()}>
//             <MenuIcon size='1.5rem' />
//           </div>
//           {isTouch && (
//             <div
//               className='side-btn'
//               onClick={() => {
//                 console.log('setChat', !chat)
//                 setChat(!chat)
//               }}
//             >
//               <ChatIcon size='1.5rem' />
//             </div>
//           )}
//           {livekit.connected && (
//             <div
//               className='side-btn'
//               onClick={() => {
//                 world.livekit.setMicrophoneEnabled()
//               }}
//             >
//               {livekit.mic ? <MicIcon size='1.5rem' /> : <MicOffIcon size='1.5rem' />}
//             </div>
//           )}
//           {world.xr.supportsVR && (
//             <div
//               className='side-btn'
//               onClick={() => {
//                 world.xr.enter()
//               }}
//             >
//               <VRIcon size='1.5rem' />
//             </div>
//           )}
//         </div>
//         {menu?.type === 'main' && <MenuMain world={world} />}
//         {menu?.type === 'app' && <MenuApp key={menu.app.data.id} world={world} app={menu.app} blur={menu.blur} />}
//         <div className='side-mid'>{!menu && !isTouch && actions && <Actions world={world} />}</div>
//         {isTouch && !chat && <MiniMessages world={world} />}
//         {(isTouch ? chat : true) && <Messages world={world} active={chat || menu} />}
//         <label className={cls('side-chatbox', { active: chat })}>
//           <input
//             ref={inputRef}
//             className='side-chatbox-input'
//             type='text'
//             placeholder='Say something...'
//             value={msg}
//             onChange={e => setMsg(e.target.value)}
//             onKeyDown={e => {
//               if (e.code === 'Escape') {
//                 setChat(false)
//               }
//               // meta quest 3 isn't spec complaint and instead has e.code = '' and e.key = 'Enter'
//               // spec says e.code should be a key code and e.key should be the text output of the key eg 'b', 'B', and '\n'
//               if (e.code === 'Enter' || e.key === 'Enter') {
//                 send(e)
//               }
//             }}
//             onBlur={e => {
//               if (!isTouch) {
//                 setChat(false)
//               }
//             }}
//           />
//         </label>
//       </div>
//     </div>
//   )
// }

function Chat({ world }) {
  const inputRef = useRef()
  const [msg, setMsg] = useState('')
  const [active, setActive] = useState(false)
  useEffect(() => {
    const onToggle = () => {
      setActive(value => !value)
    }
    world.on('sidebar-chat-toggle', onToggle)
    return () => {
      world.off('sidebar-chat-toggle', onToggle)
    }
  }, [])
  useEffect(() => {
    const control = world.controls.bind({ priority: ControlPriorities.CORE_UI })
    control.slash.onPress = () => {
      if (!active) setActive(true)
    }
    control.enter.onPress = () => {
      if (!active) setActive(true)
    }
    control.mouseLeft.onPress = () => {
      if (control.pointer.locked && active) {
        setActive(false)
      }
    }
    return () => control.release()
  }, [active])
  useEffect(() => {
    if (active) {
      inputRef.current.focus()
    } else {
      inputRef.current.blur()
    }
  }, [active])
  const send = async e => {
    if (world.controls.pointer.locked) {
      setTimeout(() => setActive(false), 10)
    }
    if (!msg) {
      e.preventDefault()
      return setActive(false)
    }
    setMsg('')
    // check for commands
    if (msg.startsWith('/')) {
      world.chat.command(msg)
      return
    }
    // otherwise post it
    world.chat.send(msg)
    if (isTouch) {
      // setActive(false)
      e.target.blur()
      setTimeout(() => setActive(false), 10)
    }
  }
  return (
    <div
      className={cls('mainchat', { active })}
      css={css`
        position: absolute;
        left: calc(2rem + env(safe-area-inset-left));
        bottom: calc(2rem + env(safe-area-inset-bottom));
        width: 20rem;
        font-size: 1rem;
        @media all and (max-width: 1200px) {
          left: calc(1rem + env(safe-area-inset-left));
          bottom: calc(1rem + env(safe-area-inset-bottom));
        }
        .mainchat-msgs {
          padding: 0 0 0.5rem 0.4rem;
        }
        .mainchat-btn {
          pointer-events: auto;
          width: 2.875rem;
          height: 2.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(11, 10, 21, 0.85);
          border: 0.0625rem solid #2a2b39;
          border-radius: 1rem;
          &:hover {
            cursor: pointer;
          }
          opacity: 0; // disabled
        }
        .mainchat-entry {
          height: 2.875rem;
          padding: 0 1rem;
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 2rem;
          display: flex;
          align-items: center;

          // debug
          display: none;
          /* pointer-events: auto;
          opacity: 1; */

          input {
            font-size: 0.9375rem;
            line-height: 1;
            &::selection {
              background-color: white;
              color: black;
            }
          }
        }
        .mainchat-send {
          width: 2.875rem;
          height: 2.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: -0.6rem;
        }
        &.active {
          pointer-events: auto;
          .mainchat-btn {
            display: none;
          }
          .mainchat-entry {
            display: flex;
          }
        }
      `}
    >
      <div className='mainchat-msgs'>
        {isTouch && !active && <MiniMessages world={world} />}
        {(!isTouch || active) && <Messages world={world} active={active} />}
      </div>
      <div
        className='mainchat-btn'
        onClick={() => {
          setActive(true)
        }}
      >
        <MessageSquareTextIcon size='1.125rem' />
      </div>
      <label className='mainchat-entry'>
        <input
          ref={inputRef}
          className='side-chatbox-input'
          type='text'
          placeholder='Say something...'
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => {
            if (e.code === 'Escape') {
              setActive(false)
            }
            // meta quest 3 isn't spec complaint and instead has e.code = '' and e.key = 'Enter'
            // spec says e.code should be a key code and e.key should be the text output of the key eg 'b', 'B', and '\n'
            if (e.code === 'Enter' || e.key === 'Enter') {
              send(e)
            }
          }}
          onBlur={e => {
            if (!isTouch) {
              setActive(false)
            }
          }}
        />
        {isTouch && (
          <div className='mainchat-send' onClick={e => send(e)}>
            <SendHorizonalIcon size='1.125rem' />
          </div>
        )}
      </label>
    </div>
  )
}

function MiniMessages({ world }) {
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    let init
    return world.chat.subscribe(msgs => {
      if (!init) {
        init = true
        return // skip first
      }
      const msg = msgs[msgs.length - 1]
      if (msg.fromId === world.network.id) return
      setMsg(msg)
    })
  }, [])
  useEffect(() => {
    const timerId = setTimeout(() => {
      setMsg(null)
    }, 4000)
    return () => clearTimeout(timerId)
  }, [msg])
  if (!msg) return null
  return <Message msg={msg} />
}

const MESSAGES_REFRESH_RATE = 30 // every x seconds

function Messages({ world, active }) {
  const initRef = useRef()
  const contentRef = useRef()
  const spacerRef = useRef()
  // const [now, setNow] = useState(() => moment())
  const [msgs, setMsgs] = useState([])
  useEffect(() => {
    return world.chat.subscribe(setMsgs)
  }, [])
  // useEffect(() => {
  //   let timerId
  //   const updateNow = () => {
  //     setNow(moment())
  //     timerId = setTimeout(updateNow, MESSAGES_REFRESH_RATE * 1000)
  //   }
  //   timerId = setTimeout(updateNow, MESSAGES_REFRESH_RATE * 1000)
  //   return () => clearTimeout(timerId)
  // }, [])
  useEffect(() => {
    if (!msgs.length) return
    const didInit = !initRef.current
    if (didInit) {
      spacerRef.current.style.height = contentRef.current.offsetHeight + 'px'
    }
    setTimeout(() => {
      contentRef.current?.scroll({
        top: 9999999,
        behavior: didInit ? 'instant' : 'smooth',
      })
    }, 10)
    initRef.current = true
  }, [msgs])
  useEffect(() => {
    const content = contentRef.current
    // const spacer = spacerRef.current
    // spacer.style.height = content.offsetHeight + 'px'
    const observer = new ResizeObserver(() => {
      contentRef.current?.scroll({
        top: 9999999,
        behavior: 'instant',
      })
    })
    observer.observe(content)
    return () => {
      observer.disconnect()
    }
  }, [])
  return (
    <div
      ref={contentRef}
      className={cls('messages noscrollbar', { active })}
      css={css`
        /* padding: 0 0 0.5rem; */
        /* margin-bottom: 20px; */
        flex: 1;
        max-height: 16rem;
        transition: all 0.15s ease-out;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        overflow-y: auto;
        -webkit-mask-image: linear-gradient(to top, black calc(100% - 10rem), black 10rem, transparent);
        mask-image: linear-gradient(to top, black calc(100% - 10rem), black 10rem, transparent);
        &.active {
          pointer-events: auto;
        }
        .messages-spacer {
          flex-shrink: 0;
        }
      `}
    >
      <div className='messages-spacer' ref={spacerRef} />
      {msgs.map(msg => (
        <Message key={msg.id} msg={msg} /*now={now}*/ />
      ))}
    </div>
  )
}

function Message({ msg, now }) {
  // const timeAgo = useMemo(() => {
  //   const createdAt = moment(msg.createdAt)
  //   const age = now.diff(createdAt, 'seconds')
  //   // up to 10s ago show now
  //   if (age < 10) return 'now'
  //   // under a minute show seconds
  //   if (age < 60) return `${age}s ago`
  //   // under an hour show minutes
  //   if (age < 3600) return Math.floor(age / 60) + 'm ago'
  //   // under a day show hours
  //   if (age < 86400) return Math.floor(age / 3600) + 'h ago'
  //   // otherwise show days
  //   return Math.floor(age / 86400) + 'd ago'
  // }, [now])
  return (
    <div
      className='message'
      css={css`
        padding: 0.25rem 0;
        line-height: 1.4;
        font-size: 1rem;
        paint-order: stroke fill;
        -webkit-text-stroke: 0.25rem rgba(0, 0, 0, 0.2);
        .message-from {
          margin-right: 0.25rem;
        }
        .message-body {
          // ...
        }
      `}
    >
      {msg.from && <span className='message-from'>[{msg.from}]</span>}
      <span className='message-body'>{msg.body}</span>
      {/* <span>{timeAgo}</span> */}
    </div>
  )
}

function Disconnected() {
  // useEffect(() => {
  //   document.body.style.filter = 'grayscale(100%)'
  //   return () => {
  //     document.body.style.filter = null
  //   }
  // }, [])
  return (
    <>
      <div
        css={css`
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          backdrop-filter: grayscale(100%);
          pointer-events: none;
          z-index: 9999;
          animation: fadeIn 3s forwards;
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}
      />
      <div
        css={css`
          pointer-events: auto;
          position: absolute;
          top: 50%;
          left: 50%;
          background: rgba(11, 10, 21, 0.85);
          border: 0.0625rem solid #2a2b39;
          backdrop-filter: blur(5px);
          border-radius: 1rem;
          height: 2.75rem;
          padding: 0 1rem;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          cursor: pointer;
          > span {
            margin-left: 0.4rem;
          }
        `}
        onClick={() => window.location.reload()}
      >
        <RefreshCwIcon size='1.1rem' />
        <span>Reconnect</span>
      </div>
    </>
  )
}

function LoadingOverlay({ world }) {
  const [progress, setProgress] = useState(0)
  const { title, desc, image } = world.settings
  useEffect(() => {
    world.on('progress', setProgress)
    return () => {
      world.off('progress', setProgress)
    }
  }, [])
  return (
    <div
      css={css`
        position: absolute;
        inset: 0;
        background: black;
        display: flex;
        pointer-events: auto;
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        .loading-image {
          position: absolute;
          inset: 0;
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
          background-image: ${image ? `url(${world.resolveURL(image.url)})` : 'none'};
          animation: pulse 5s ease-in-out infinite;
        }
        .loading-shade {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(15px);
        }
        .loading-info {
          position: absolute;
          bottom: 50px;
          left: 50px;
          right: 50px;
          max-width: 28rem;
        }
        .loading-title {
          font-size: 2.4rem;
          line-height: 1.2;
          font-weight: 600;
          margin: 0 0 0.5rem;
        }
        .loading-desc {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1rem;
          margin: 0 0 20px;
        }
        .loading-track {
          height: 5px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.1);
          position: relative;
        }
        .loading-bar {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: ${progress}%;
          background: white;
          border-radius: 3px;
          transition: width 0.2s ease-out;
        }
      `}
    >
      <div className='loading-image' />
      <div className='loading-shade' />
      <div className='loading-info'>
        {title && <div className='loading-title'>{title}</div>}
        {desc && <div className='loading-desc'>{desc}</div>}
        <div className='loading-track'>
          <div className='loading-bar' />
        </div>
      </div>
    </div>
  )
}

const kickMessages = {
  duplicate_user: 'Player already active on another device or window.',
  player_limit: 'Player limit reached.',
  unknown: 'You were kicked.',
}
function KickedOverlay({ code }) {
  return (
    <div
      css={css`
        position: absolute;
        inset: 0;
        background: black;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        svg {
          animation: spin 1s linear infinite;
        }
      `}
    >
      <div>{kickMessages[code] || kickMessages.unknown}</div>
    </div>
  )
}

function ActionsBlock({ world }) {
  const [showActions, setShowActions] = useState(() => world.prefs.actions)
  useEffect(() => {
    const onPrefsChange = changes => {
      if (changes.actions) setShowActions(changes.actions.value)
    }
    world.prefs.on('change', onPrefsChange)
    return () => {
      world.prefs.off('change', onPrefsChange)
    }
  }, [])
  if (isTouch) return null
  if (!showActions) return null
  return (
    <div
      css={css`
        position: absolute;
        top: calc(2rem + env(safe-area-inset-top));
        left: calc(2rem + env(safe-area-inset-left));
        bottom: calc(2rem + env(safe-area-inset-bottom));
        display: flex;
        flex-direction: column;
        align-items: center;
        @media all and (max-width: 1200px) {
          top: calc(1rem + env(safe-area-inset-top));
          left: calc(1rem + env(safe-area-inset-left));
          bottom: calc(1rem + env(safe-area-inset-bottom));
        }
      `}
    >
      <Actions world={world} />
    </div>
  )
}

function Actions({ world }) {
  const [actions, setActions] = useState(() => world.controls.actions)
  useEffect(() => {
    world.on('actions', setActions)
    return () => world.off('actions', setActions)
  }, [])
  return (
    <div
      className='actions'
      css={css`
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        .actions-item {
          display: flex;
          align-items: center;
          margin: 0 0 0.5rem;
          &-icon {
            // ...
          }
          &-label {
            margin-left: 0.625em;
            paint-order: stroke fill;
            -webkit-text-stroke: 0.25rem rgba(0, 0, 0, 0.2);
          }
        }
      `}
    >
      {actions.map(action => (
        <div className='actions-item' key={action.id}>
          <div className='actions-item-icon'>{getActionIcon(action)}</div>
          <div className='actions-item-label'>{action.label}</div>
        </div>
      ))}
    </div>
  )
}

function getActionIcon(action) {
  if (action.type === 'custom') {
    return <ActionPill label={action.btn} />
  }
  if (action.type === 'controlLeft') {
    return <ActionPill label='Ctrl' />
  }
  if (action.type === 'mouseLeft') {
    return <ActionIcon icon={MouseLeftIcon} />
  }
  if (action.type === 'mouseRight') {
    return <ActionIcon icon={MouseRightIcon} />
  }
  if (action.type === 'mouseWheel') {
    return <ActionIcon icon={MouseWheelIcon} />
  }
  if (buttons.has(action.type)) {
    return <ActionPill label={propToLabel[action.type]} />
  }
  return <ActionPill label='?' />
}

function ActionPill({ label }) {
  return (
    <div
      className='actionpill'
      css={css`
        border: 0.0625rem solid white;
        border-radius: 0.25rem;
        background: rgba(0, 0, 0, 0.1);
        padding: 0.25rem 0.375rem;
        font-size: 0.875em;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        paint-order: stroke fill;
        -webkit-text-stroke: 0.25rem rgba(0, 0, 0, 0.2);
      `}
    >
      {label}
    </div>
  )
}

function ActionIcon({ icon: Icon }) {
  return (
    <div
      className='actionicon'
      css={css`
        line-height: 0;
        svg {
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
        }
      `}
    >
      <Icon size='1.5rem' />
    </div>
  )
}

function Reticle({ world }) {
  const [pointerLocked, setPointerLocked] = useState(world.controls.pointer.locked)
  const [buildMode, setBuildMode] = useState(world.builder.enabled)
  useEffect(() => {
    world.on('pointer-lock', setPointerLocked)
    world.on('build-mode', setBuildMode)
    return () => {
      world.off('pointer-lock', setPointerLocked)
      world.off('build-mode', setBuildMode)
    }
  }, [])
  const visible = isTouch ? true : pointerLocked
  if (!visible) return null
  return (
    <div
      className='reticle'
      css={css`
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        .reticle-item {
          width: 0.25rem;
          height: 0.25rem;
          border-radius: 0.625rem;
          /* border: 0.125rem solid ${buildMode ? '#ff4d4d' : 'white'}; */
          background: ${buildMode ? '#ff4d4d' : 'white'};
          border: 0.5px solid rgba(0, 0, 0, 0.3);
          /* mix-blend-mode: ${buildMode ? 'normal' : 'difference'}; */
        }
      `}
    >
      <div className='reticle-item' />
    </div>
  )
}

function Toast({ world }) {
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    let ids = 0
    const onToast = text => {
      setMsg({ text, id: ++ids })
    }
    world.on('toast', onToast)
    return () => world.off('toast', onToast)
  }, [])
  if (!msg) return null
  return (
    <div
      className='toast'
      css={css`
        position: absolute;
        top: calc(50% - 4.375rem);
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .toast-msg {
          height: 2.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 1rem;
          background: rgba(11, 10, 21, 0.85);
          border: 0.0625rem solid #2a2b39;
          backdrop-filter: blur(5px);
          border-radius: 1.4375rem;
          opacity: 0;
          transform: translateY(0.625rem) scale(0.9);
          transition: all 0.1s ease-in-out;
          &.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
            animation: toastIn 0.1s ease-in-out;
          }
        }
      `}
    >
      {msg && <ToastMsg key={msg.id} text={msg.text} />}
    </div>
  )
}

function ToastMsg({ text }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    setTimeout(() => setVisible(false), 1000)
  }, [])
  return <div className={cls('toast-msg', { visible })}>{text}</div>
}

function TouchBtns({ world }) {
  const [action, setAction] = useState(world.actions.current.node)
  // const [adsToggled, setAdsToggled] = useState(false) // REMOVED
  // const [cameraMode, setCameraMode] = useState(0) // REMOVED - 0 = medium 3rd (default), 1 = close 3rd, 2 = first person, 3 = far 3rd
  // const [platformerMode, setPlatformerMode] = useState(0) // DISABLED - Track current platformer mode

  useEffect(() => {
    function onChange(isAction) {
      setAction(isAction)
    }
    world.actions.on('change', onChange)
    return () => {
      world.actions.off('change', onChange)
    }
  }, [])

  // Track platformer mode changes - DISABLED
  {/*
  useEffect(() => {
    const player = world.entities.player
    if (player) {
      setPlatformerMode(player.platformerMode || 0)
    }
  }, [world])

  // Update platformer mode when player changes
  useEffect(() => {
    const player = world.entities.player
    if (player) {
      const updatePlatformerMode = () => {
        setPlatformerMode(player.platformerMode || 0)
      }

      // Listen for player updates
      world.on('player', updatePlatformerMode)

      return () => {
        world.off('player', updatePlatformerMode)
      }
    }
  }, [world])
  */}

  // Handle ADS toggle state - REMOVED
  {/*
  useEffect(() => {
    if (adsToggled) {
      world.controls.simulateButton('mouseRight', true)
    } else {
      world.controls.simulateButton('mouseRight', false)
    }
  }, [adsToggled, world])
  */}

  // Handle camera mode changes - Desktop scroll emulation - REMOVED
  {/*
  useEffect(() => {
    const player = world.entities.player
    if (player) {
      // Desktop scroll emulation - starts at medium 3rd person (default)
      // 0 = medium 3rd person (zoom = 5.0, avatar visible) - DEFAULT
      // 1 = close 3rd person (zoom = 1.0, avatar visible)
      // 2 = first person (zoom = 0, avatar hidden)
      // 3 = far 3rd person (zoom = 7.0, avatar visible) - furthest back
      const zoomLevels = [5.0, 1, 0, 7]
      player.cam.zoom = zoomLevels[cameraMode]

      // Hide/show avatar based on camera mode
      if (player.avatar) {
        player.avatar.visible = cameraMode !== 2 // Hide avatar only in first person
      }
    }
  }, [cameraMode, world])

  const cycleCameraMode = () => {
    setCameraMode(prev => (prev + 1) % 4) // Cycle through 4 modes: 0, 1, 2, 3
  }
  */}

  // lookpad removed
  return (
    <div
      className='touchbtns'
      css={css`
        position: absolute;
        top: calc(1.5rem + env(safe-area-inset-top));
        right: calc(1.5rem + env(safe-area-inset-right));
        bottom: calc(1.5rem + env(safe-area-inset-bottom));
        left: calc(1.5rem + env(safe-area-inset-left));
        .touchbtns-btn {
          pointer-events: auto;
          position: absolute;
          /* border: 1px solid rgba(255, 255, 255, 0.1); */
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          &.jump {
            width: 4rem;
            height: 4rem;
            bottom: 1rem;
            right: 1rem;
          }
          &.action {
            width: 2.5rem;
            height: 2.5rem;
            bottom: 6rem;
            right: 4rem;
          }
          /* Ads and Camera styles - REMOVED
          &.ads {
            width: 2.5rem;
            height: 2.5rem;
            bottom: 9.25rem;
            right: 4rem;
            font-size: 0.75rem;
            &.active {
              background: rgba(0, 255, 170, 0.4);
              border-color: rgba(0, 255, 170, 0.6);
              color: #00ffaa;
            }
          }
          &.camera {
            width: 2rem;
            height: 2rem;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.6rem;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
            opacity: 0.6;
            transition: opacity 0.2s ease;
            &:hover {
              opacity: 0.8;
            }
            &:active {
              opacity: 1;
            }
            &.medium-3rd {
              background: rgba(100, 200, 255, 0.15);
              border-color: rgba(100, 200, 255, 0.3);
              color: #64c8ff;
            }
            &.close-3rd {
              background: rgba(100, 255, 100, 0.15);
              border-color: rgba(100, 255, 100, 0.3);
              color: #64ff64;
            }
            &.first-person {
              background: rgba(255, 100, 100, 0.15);
              border-color: rgba(255, 100, 100, 0.3);
              color: #ff6464;
            }
            &.far-3rd {
              background: rgba(200, 200, 255, 0.15);
              border-color: rgba(200, 200, 255, 0.3);
              color: #c8c8ff;
            }
          }
          */
          /* Platformer styles - DISABLED
          &.platformer {
            width: 2.5rem;
            height: 2.5rem;
            font-size: 0.7rem;
            font-weight: bold;
            &.climb {
              bottom: 12.5rem;
              right: 1rem;
              background: rgba(255, 140, 0, 0.3);
              border: 1px solid rgba(255, 140, 0, 0.5);
              color: #ff8c00;
            }
            &.ledge {
              bottom: 12.5rem;
              right: 4rem;
              background: rgba(255, 68, 0, 0.3);
              border: 1px solid rgba(255, 68, 0, 0.5);
              color: #ff4400;
            }
            &.dive {
              bottom: 12.5rem;
              right: 7rem;
              background: rgba(136, 0, 255, 0.3);
              border: 1px solid rgba(136, 0, 255, 0.5);
              color: #8800ff;
            }
            &.active {
              background: rgba(0, 255, 170, 0.4);
              border-color: rgba(0, 255, 170, 0.6);
              color: #00ffaa;
            }
          }
          */
        }
        /* lookpad removed */
      `}
    >
      {/* lookpad removed */}
      {action && (
        <div
          className='touchbtns-btn action'
          onPointerDown={e => {
            e.currentTarget.setPointerCapture(e.pointerId)
            world.controls.setTouchBtn('touchB', true)
          }}
          onPointerLeave={e => {
            world.controls.setTouchBtn('touchB', false)
            e.currentTarget.releasePointerCapture(e.pointerId)
          }}
        >
          <HandIcon size='1.5rem' />
        </div>
      )}
      {/* ADS / Right-click button for mobile - REMOVED */}
      {/*
      <div
        className={cls('touchbtns-btn ads', { active: adsToggled })}
        onPointerDown={e => {
          e.stopPropagation() // Prevent interference with other controls
          // Toggle ADS state
          setAdsToggled(!adsToggled)
        }}
      >
        ADS
        {adsToggled && <div style={{ fontSize: '0.6rem', marginTop: '0.2rem', opacity: 0.8 }}>ON</div>}
      </div>
      */}
      <div
        className='touchbtns-btn jump'
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          world.controls.setTouchBtn('touchA', true)
        }}
        onPointerLeave={e => {
          world.controls.setTouchBtn('touchA', false)
          e.currentTarget.releasePointerCapture(e.pointerId)
        }}
        onPointerUp={e => {
          world.controls.setTouchBtn('touchA', false)
          e.currentTarget.releasePointerCapture(e.pointerId)
        }}
      >
        <ChevronDoubleUpIcon size='1.5rem' />
      </div>

      {/* Camera cycle button - Desktop scroll emulation - REMOVED */}
      {/*
      <div
        className={cls('touchbtns-btn camera', {
          'medium-3rd': cameraMode === 0,
          'close-3rd': cameraMode === 1,
          'first-person': cameraMode === 2,
          'far-3rd': cameraMode === 3,
        })}
        onPointerDown={e => {
          e.stopPropagation()
          cycleCameraMode()
        }}
        title={`Camera: ${
          cameraMode === 0
            ? 'Medium 3rd'
            : cameraMode === 1
              ? 'Close 3rd'
              : cameraMode === 2
                ? 'First Person'
                : 'Far 3rd'
        }`}
      >
        <CameraIcon size='1rem' />
      </div>
      */}

      {/* Platformer Mechanics Buttons - DISABLED */}
      {/*
      <div
        className={cls('touchbtns-btn platformer climb', {
          active: platformerMode === 10, // CLIMBING mode
        })}
        onPointerDown={e => {
          e.stopPropagation()
          world.controls.simulateButton('keyF', true)
          setTimeout(() => world.controls.simulateButton('keyF', false), 100)
        }}
        title='Climb Walls (F)'
      >
        CLIMB
      </div>

      <div
        className={cls('touchbtns-btn platformer ledge', {
          active: platformerMode === 11, // LEDGE_HANGING mode
        })}
        onPointerDown={e => {
          e.stopPropagation()
          world.controls.simulateButton('keyG', true)
          setTimeout(() => world.controls.simulateButton('keyG', false), 100)
        }}
        title='Grab Ledges (G)'
      >
        LEDGE
      </div>

      <div
        className={cls('touchbtns-btn platformer dive', {
          active: platformerMode === 12, // AIR_DIVING mode
        })}
        onPointerDown={e => {
          e.stopPropagation()
          world.controls.simulateButton('keyH', true)
          setTimeout(() => world.controls.simulateButton('keyH', false), 100)
        }}
        title='Air Dive (H)'
      >
        DIVE
      </div>

      <div
        className='platformer-status'
        css={css`
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 0.5rem;
          padding: 0.5rem;
          color: white;
          font-size: 0.8rem;
          pointer-events: none;
          opacity: ${platformerMode !== 0 ? 1 : 0.3};
          transition: opacity 0.3s ease;
        `}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>Platformer Status</div>
        <div>
          {platformerMode === 9 && '🛤️ Grinding'}
          {platformerMode === 10 && '🧗 Climbing'}
          {platformerMode === 11 && '🤝 Hanging'}
          {platformerMode === 12 && '💨 Air Diving'}
          {platformerMode === 13 && '🏃 Wall Sliding'}
          {platformerMode === 0 && 'Ready'}
        </div>
        {world.entities.player && (
          <div style={{ marginTop: '0.2rem', fontSize: '0.7rem' }}>
            Stamina: {Math.round(world.entities.player.getStamina())}%
          </div>
        )}
      </div>
      */}
    </div>
  )
}

function TouchStick({ world }) {
  const outerRef = useRef()
  const innerRef = useRef()
  useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    function onStick(stick) {
      if (stick) {
        outer.style.left = `${stick.center.x}px`
        outer.style.top = `${stick.center.y}px`
        inner.style.left = `${stick.touch.position.x}px`
        inner.style.top = `${stick.touch.position.y}px`
        inner.style.opacity = 1
      } else {
        inner.style.opacity = 0.1
        const radius = 50 // matches PlayerLocal.js STICK_OUTER_RADIUS
        if (window.innerWidth < window.innerHeight) {
          // portrait
          outer.style.left = `calc(env(safe-area-inset-left) + ${radius}px + 50px)`
          outer.style.top = `calc(100dvh - env(safe-area-inset-bottom) - ${radius}px - 50px)`
          inner.style.left = `calc(env(safe-area-inset-left) + ${radius}px + 50px)`
          inner.style.top = `calc(100dvh - env(safe-area-inset-bottom) - ${radius}px - 50px)`
        } else {
          // landscape
          outer.style.left = `calc(env(safe-area-inset-left) + ${radius}px + 90px)`
          outer.style.top = `calc(100dvh - env(safe-area-inset-bottom) - ${radius}px - 50px)`
          inner.style.left = `calc(env(safe-area-inset-left) + ${radius}px + 90px)`
          inner.style.top = `calc(100dvh - env(safe-area-inset-bottom) - ${radius}px - 50px)`
        }
      }
    }
    onStick(null)
    world.on('stick', onStick)
    return () => {
      world.off('stick', onStick)
    }
  }, [])
  return (
    <div
      className='stick'
      css={css`
        .stick-outer {
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 100px;
          background: rgba(0, 0, 0, 0.3);
          transform: translate(-50%, -50%);
        }
        .stick-caret {
          position: absolute;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          &.n {
            top: 0;
            left: 50%;
            transform: translate(-50%, 0);
          }
          &.e {
            top: 50%;
            right: 0;
            transform: translate(0, -50%) rotate(90deg);
          }
          &.s {
            left: 50%;
            bottom: 0;
            transform: translate(-50%, 0) rotate(180deg);
          }
          &.w {
            top: 50%;
            left: 0;
            transform: translate(0, -50%) rotate(-90deg);
          }
        }
        .stick-inner {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50px;
          background: white;
          transform: translate(-50%, -50%);
        }
      `}
    >
      <div className='stick-outer' ref={outerRef}>
        {/* <div className='stick-caret n'>
          <ChevronUpIcon size={16} />
        </div>
        <div className='stick-caret e'>
          <ChevronUpIcon size={16} />
        </div>
        <div className='stick-caret s'>
          <ChevronUpIcon size={16} />
        </div>
        <div className='stick-caret w'>
          <ChevronUpIcon size={16} />
        </div> */}
      </div>
      <div className='stick-inner' ref={innerRef} />
    </div>
  )
}

function Confirm({ options }) {
  return (
    <div
      className='confirm'
      css={css`
        position: absolute;
        inset: 0;
        padding: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
        .confirm-dialog {
          pointer-events: auto;
          background: rgba(11, 10, 21, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.375rem;
          backdrop-filter: blur(5px);
          width: 18rem;
        }
        .confirm-content {
          padding: 1.4rem;
        }
        .confirm-title {
          text-align: center;
          font-size: 1.1rem;
          font-weight: 500;
          margin: 0 0 0.7rem;
        }
        .confirm-message {
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9375rem;
          line-height: 1.4;
        }
        .confirm-actions {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: stretch;
        }
        .confirm-action {
          flex: 1;
          min-height: 2.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
          &.left {
            border-right: 1px solid rgba(255, 255, 255, 0.05);
          }
          > span {
            font-size: 0.9375rem;
            color: rgba(255, 255, 255, 0.8);
          }
          &:hover {
            cursor: pointer;
            > span {
              color: white;
            }
          }
        }
      `}
    >
      <div className='confirm-dialog'>
        <div className='confirm-content'>
          <div className='confirm-title'>{options.title}</div>
          <div className='confirm-message'>{options.message}</div>
        </div>
        <div className='confirm-actions'>
          <div className='confirm-action left' onClick={options.confirm}>
            <span>{options.confirmText || 'Okay'}</span>
          </div>
          <div className='confirm-action' onClick={options.cancel}>
            <span>{options.cancelText || 'Cancel'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
