package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.chat.*;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.chat.*;
import com.ecms_web_application.OC01.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/conversations")
    public ResponseEntity<RequestResponse> create(@Valid @RequestBody CreateConversationRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(chatService.createConversation(r), "Tao conversation thanh cong"));
    }

    @GetMapping("/conversations")
    public ResponseEntity<RequestResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ConversationResponse> d = chatService.getMyConversations(page, size);
        return ResponseEntity.ok(new RequestResponse(d, "OK"));
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<RequestResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(new RequestResponse(chatService.getConversationById(id), "OK"));
    }

    @PatchMapping("/conversations/{id}/name")
    public ResponseEntity<RequestResponse> rename(@PathVariable Long id, @RequestBody Map<String,String> b) {
        chatService.updateConversationName(id, b.get("name"));
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PatchMapping("/conversations/{id}/permission")
    public ResponseEntity<RequestResponse> perm(@PathVariable Long id, @RequestBody Map<String,String> b) {
        chatService.updateMessagePermission(id, b.get("permission"));
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @GetMapping("/conversations/{id}/participants")
    public ResponseEntity<RequestResponse> participants(@PathVariable Long id) {
        List<ParticipantResponse> d = chatService.getParticipants(id);
        return ResponseEntity.ok(new RequestResponse(d, "OK"));
    }

    @PostMapping("/conversations/{id}/participants")
    public ResponseEntity<RequestResponse> addParts(@PathVariable Long id,
            @Valid @RequestBody AddParticipantRequest r) {
        return ResponseEntity.ok(new RequestResponse(chatService.addParticipants(id, r), "OK"));
    }

    @DeleteMapping("/conversations/{id}/participants/{accountId}")
    public ResponseEntity<RequestResponse> removePart(@PathVariable Long id, @PathVariable Long accountId) {
        chatService.removeParticipant(id, accountId);
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PatchMapping("/conversations/{id}/participants/{accountId}/role")
    public ResponseEntity<RequestResponse> setRole(@PathVariable Long id, @PathVariable Long accountId,
            @RequestBody Map<String,String> b) {
        chatService.updateParticipantRole(id, accountId, b.get("role"));
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PatchMapping("/conversations/{id}/participants/{accountId}/mute")
    public ResponseEntity<RequestResponse> mute(@PathVariable Long id, @PathVariable Long accountId,
            @RequestBody Map<String,Object> b) {
        LocalDateTime mu = b.get("mutedUntil") != null ? LocalDateTime.parse(b.get("mutedUntil").toString()) : null;
        String reason = b.get("reason") != null ? b.get("reason").toString() : null;
        chatService.muteParticipant(id, accountId, mu, reason);
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PatchMapping("/conversations/{id}/participants/{accountId}/unmute")
    public ResponseEntity<RequestResponse> unmute(@PathVariable Long id, @PathVariable Long accountId) {
        chatService.unmuteParticipant(id, accountId);
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PatchMapping("/conversations/{id}/participants/{accountId}/ban")
    public ResponseEntity<RequestResponse> ban(@PathVariable Long id, @PathVariable Long accountId,
            @RequestBody Map<String,String> b) {
        chatService.banParticipant(id, accountId, b.get("reason"));
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PatchMapping("/conversations/{id}/participants/{accountId}/unban")
    public ResponseEntity<RequestResponse> unban(@PathVariable Long id, @PathVariable Long accountId) {
        chatService.unbanParticipant(id, accountId);
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PatchMapping("/conversations/{id}/transfer-ownership")
    public ResponseEntity<RequestResponse> transfer(@PathVariable Long id, @RequestBody Map<String,Long> b) {
        chatService.transferOwnership(id, b.get("newOwnerAccountId"));
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<RequestResponse> send(@PathVariable Long id,
            @Valid @RequestBody SendMessageRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(chatService.sendMessage(id, r), "OK"));
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<RequestResponse> messages(@PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        List<MessageResponse> d = chatService.getMessages(id, page, size);
        return ResponseEntity.ok(new RequestResponse(d, "OK"));
    }

    @PatchMapping("/conversations/{id}/read")
    public ResponseEntity<RequestResponse> read(@PathVariable Long id,
            @RequestBody(required = false) Map<String,Long> b) {
        chatService.markAsRead(id, b != null ? b.get("lastReadMessageId") : null);
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PutMapping("/messages/{id}")
    public ResponseEntity<RequestResponse> edit(@PathVariable Long id, @RequestBody Map<String,String> b) {
        return ResponseEntity.ok(new RequestResponse(chatService.editMessage(id, b.get("content")), "OK"));
    }

    @DeleteMapping("/messages/{id}")
    public ResponseEntity<RequestResponse> del(@PathVariable Long id) {
        chatService.deleteMessage(id);
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PatchMapping("/conversations/{id}/pin")
    public ResponseEntity<RequestResponse> pin(@PathVariable Long id, @RequestParam boolean pinned) {
        chatService.pinConversation(id, pinned);
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PatchMapping("/conversations/{id}/mute-by-user")
    public ResponseEntity<RequestResponse> muteByUser(@PathVariable Long id, @RequestParam boolean muted) {
        chatService.muteConversationByUser(id, muted);
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PatchMapping("/conversations/{id}/archive")
    public ResponseEntity<RequestResponse> archive(@PathVariable Long id, @RequestParam boolean archived) {
        chatService.archiveConversation(id, archived);
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @GetMapping("/users/search")
    public ResponseEntity<RequestResponse> search(@RequestParam String keyword) {
        List<UserSearchResponse> d = chatService.searchUsers(keyword);
        return ResponseEntity.ok(new RequestResponse(d, "OK"));
    }
}