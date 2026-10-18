package com.ecms_web_application.OC01.config;

import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.repository.ChatParticipantRepository;
import com.ecms_web_application.OC01.service.AccountService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.security.Principal;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * WebSocket config:
 *  1. CONNECT: fail-closed (thiếu/sai token -> reject).
 *  2. SUBSCRIBE/SEND: whitelist destination + check membership.
 */
@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final AccountService accountService;
    private final CookieUtil cookieUtil;
    private final ChatParticipantRepository chatParticipantRepository;

    @Value("${app.websocket.allowed-origins:http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173}")
    private String allowedOriginsRaw;

    private static final Pattern USER_TOPIC_PATTERN =
            Pattern.compile("^/topic/user/(\\d+)(/.*)?$");
    private static final Pattern CONVERSATION_TOPIC_PATTERN =
            Pattern.compile("^/topic/conversation/(\\d+)(/.*)?$");

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = Arrays.stream(allowedOriginsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins)
                .withSockJS()
                .setInterceptors(new HandshakeInterceptor() {
                    @Override
                    public boolean beforeHandshake(ServerHttpRequest request,
                                                   ServerHttpResponse response,
                                                   WebSocketHandler wsHandler,
                                                   Map<String, Object> attributes) {
                        if (request instanceof ServletServerHttpRequest servletRequest) {
                            HttpServletRequest httpRequest = servletRequest.getServletRequest();
                            Optional<String> tokenOpt = cookieUtil.getAccessTokenFromCookies(httpRequest);
                            tokenOpt.ifPresent(token -> attributes.put("token", token));
                        }
                        return true;
                    }

                    @Override
                    public void afterHandshake(ServerHttpRequest request,
                                               ServerHttpResponse response,
                                               WebSocketHandler wsHandler,
                                               Exception exception) {
                    }
                });
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
                        message, StompHeaderAccessor.class);
                if (accessor == null) return message;
                StompCommand cmd = accessor.getCommand();
                if (cmd == null) return message;
                switch (cmd) {
                    case CONNECT -> handleConnect(accessor);
                    case SUBSCRIBE -> handleSubscribe(accessor);
                    case SEND -> handleSend(accessor);
                    default -> { }
                }
                return message;
            }
        });
    }

    // ==================== CONNECT ====================

    private void handleConnect(StompHeaderAccessor accessor) {
        String token = extractToken(accessor);
        if (token == null || token.isEmpty()) {
            log.warn("[WS] CONNECT rejected: missing token");
            throw new MessagingException("Missing authentication token");
        }
        try {
            String username = jwtService.extractUsername(token);
            if (username == null
                    || !Boolean.TRUE.equals(jwtService.isAccessToken(token))
                    || !Boolean.TRUE.equals(jwtService.validateToken(token))) {
                log.warn("[WS] CONNECT rejected: invalid or refresh token");
                throw new MessagingException("Invalid access token");
            }
            UserDetails userDetails = accountService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            accessor.setUser(auth);
            log.info("[WS] CONNECT success: user={}", username);
        } catch (MessagingException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[WS] CONNECT rejected: {}", e.getMessage());
            throw new MessagingException("Invalid token");
        }
    }

    private String extractToken(StompHeaderAccessor accessor) {
        if (accessor.getSessionAttributes() != null) {
            Object t = accessor.getSessionAttributes().get("token");
            if (t instanceof String s && !s.isEmpty()) return s;
        }
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    // ==================== SUBSCRIBE ====================

    private void handleSubscribe(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal == null) {
            throw new MessagingException("Not authenticated");
        }
        String destination = accessor.getDestination();
        if (destination == null) throw new MessagingException("Missing destination");
        Long currentId = extractAccountId(principal);
        if (currentId == null) throw new MessagingException("Cannot resolve account");
        if (!canSubscribe(destination, currentId)) {
            log.warn("[WS] SUBSCRIBE rejected: user={} dest={}", currentId, destination);
            throw new MessagingException("Forbidden subscription");
        }
    }

    private boolean canSubscribe(String destination, Long currentId) {
        if (destination.startsWith("/user/")) {
            String afterUser = destination.substring("/user/".length());
            return afterUser.startsWith("queue/") || afterUser.startsWith("topic/");
        }

        Matcher mUser = USER_TOPIC_PATTERN.matcher(destination);
        if (mUser.matches()) {
            try {
                Long target = Long.parseLong(mUser.group(1));
                return target.equals(currentId);
            } catch (NumberFormatException e) {
                return false;
            }
        }

        Matcher mConv = CONVERSATION_TOPIC_PATTERN.matcher(destination);
        if (mConv.matches()) {
            try {
                Long convId = Long.parseLong(mConv.group(1));
                return chatParticipantRepository
                        .existsByConversationIdAndAccountIdAndLeftAtIsNull(convId, currentId);
            } catch (NumberFormatException e) {
                return false;
            }
        }
        return false;
    }

    // ==================== SEND ====================

    private void handleSend(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith("/app/")) {
            log.warn("[WS] SEND rejected: dest={}", destination);
            throw new MessagingException("Forbidden destination");
        }
        if (accessor.getUser() == null) {
            throw new MessagingException("Not authenticated");
        }
    }

    // ==================== HELPERS ====================

    private Long extractAccountId(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            Object p = auth.getPrincipal();
            if (p instanceof Account acc) return acc.getId();
        }
        return null;
    }
}