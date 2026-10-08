package com.ecms_web_application.OC01.controller;//package org.wisdom.oc01.controller;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.authentication.*;
//import org.springframework.security.core.Authentication;
//import org.springframework.security.core.userdetails.UsernameNotFoundException;
//import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
//import org.springframework.security.oauth2.core.user.OAuth2User;
//import org.springframework.web.bind.annotation.*;
//import org.wisdom.oc01.config.JwtService;
//import org.wisdom.oc01.dto.RequestResponse;
//import org.wisdom.oc01.dto.request.LoginDTO;
//import org.wisdom.oc01.dto.response.Token;
//import org.wisdom.oc01.entity.Account;
//import org.wisdom.oc01.exception.ExceptionResponse;
//import org.wisdom.oc01.generic.GenericController;
//import org.wisdom.oc01.generic.IService;
//import org.wisdom.oc01.service.AccountService;
//
///**
// * Controller quản lý các API liên quan đến tài khoản người dùng.
// */
//@RestController
//@RequestMapping("/api/account")
//public class AccountController extends GenericController<Account, Integer> {
//
//    private final AccountService accountService; // Service để xử lý logic liên quan đến tài khoản
//
//    @Autowired
//    private AuthenticationManager authenticationManager; // Quản lý xác thực
//
//    @Autowired
//    private JwtService jwtService; // Dịch vụ tạo và xử lý JWT token
//
//    public AccountController(AccountService accountService) {
//        this.accountService = accountService;
//    }
//
//    /**
//     * Cung cấp service cho lớp cha GenericController.
//     *
//     * @return Service của Account.
//     */
//    @Override
//    public IService<Account, Integer> getService() {
//        return accountService;
//    }
//
//    /**
//     * Xử lý đăng nhập người dùng.
//     *
//     * @param loginDTO Thông tin đăng nhập bao gồm username và password.
//     * @return Phản hồi chứa JWT token nếu đăng nhập thành công, hoặc thông báo lỗi.
//     */
//    @PostMapping("/login")
//    public ResponseEntity<?> login(@RequestBody LoginDTO loginDTO) {
//        try {
//            // Xác thực thông tin đăng nhập
//            Authentication authentication = authenticationManager.authenticate(
//                    new UsernamePasswordAuthenticationToken(
//                            loginDTO.getUsername(),
//                            loginDTO.getPassword()));
//
//            // Nếu xác thực thành công, tạo token và trả về
//            if (authentication.isAuthenticated()) {
//                String token = jwtService.generateToken(loginDTO.getUsername());
//                return ResponseEntity.status(HttpStatus.OK)
//                        .body(new RequestResponse(new Token(token)));
//            } else {
//                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
//                        .body(new ExceptionResponse("Invalid username or password"));
//            }
//        } catch (UsernameNotFoundException e) {
//            return ResponseEntity.status(HttpStatus.NOT_FOUND)
//                    .body(new ExceptionResponse("Username not found"));
//        } catch (BadCredentialsException e) {
//            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
//                    .body(new ExceptionResponse("Incorrect password"));
//        } catch (LockedException e) {
//            return ResponseEntity.status(HttpStatus.FORBIDDEN)
//                    .body(new ExceptionResponse("Account is locked"));
//        } catch (DisabledException e) {
//            return ResponseEntity.status(HttpStatus.FORBIDDEN)
//                    .body(new ExceptionResponse("Account is disabled"));
//        } catch (AccountExpiredException e) {
//            return ResponseEntity.status(HttpStatus.FORBIDDEN)
//                    .body(new ExceptionResponse("Account has expired"));
//        } catch (CredentialsExpiredException e) {
//            return ResponseEntity.status(HttpStatus.FORBIDDEN)
//                    .body(new ExceptionResponse("Credentials have expired"));
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
//                    .body(new ExceptionResponse("An error occurred: " + e.getMessage()));
//        }
//    }
//
//    /**
//     * Xử lý đăng ký tài khoản mới.
//     *
//     * @param account Thông tin tài khoản cần đăng ký.
//     * @return Phản hồi xác nhận đăng ký thành công hoặc thông báo lỗi.
//     */
//    @PostMapping("/register")
//    public ResponseEntity<?> register(@RequestBody Account account) {
//        try {
//            // Lưu tài khoản mới
//            accountService.save(account);
//            return ResponseEntity.status(HttpStatus.CREATED)
//                    .body(new RequestResponse("Account registered successfully."));
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
//                    .body(new ExceptionResponse("An error occurred: " + e.getMessage()));
//        }
//    }
//
//    /**
//     * Xử lý đăng nhập bằng OAuth2 thành công.
//     *
//     * @param authentication Thông tin xác thực OAuth2.
//     * @return Phản hồi chứa JWT token nếu đăng nhập thành công.
//     */
//    @GetMapping("/oauth2/success")
//    public ResponseEntity<?> oauth2Success(Authentication authentication) {
//        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
//        OAuth2User oauthUser = oauthToken.getPrincipal();
//
//        // Lấy email từ OAuth2User
//        String email = oauthUser.getAttribute("email");
//        if (email == null) {
//            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
//                    .body(new ExceptionResponse("Email không tồn tại trong thông tin OAuth2"));
//        }
//
//        // Tạo JWT token
//        String token = jwtService.generateToken(email);
//
//        return ResponseEntity.ok(new RequestResponse(new Token(token), "Đăng nhập OAuth2 thành công!"));
//    }
//}
