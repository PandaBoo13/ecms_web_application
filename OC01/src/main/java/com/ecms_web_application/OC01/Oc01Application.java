package com.ecms_web_application.OC01;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.ai.model.google.genai.autoconfigure.embedding.GoogleGenAiEmbeddingConnectionAutoConfiguration;

@SpringBootApplication(exclude = {
		GoogleGenAiEmbeddingConnectionAutoConfiguration.class
})
@EnableScheduling
public class Oc01Application {
	public static void main(String[] args) {
		SpringApplication.run(Oc01Application.class, args);
	}
}