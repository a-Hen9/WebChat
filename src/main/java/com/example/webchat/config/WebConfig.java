package com.example.webchat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.webjars.WebJarAssetLocator;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Bean
    public WebJarAssetLocator webJarAssetLocator() {
        return new WebJarAssetLocator();
    }
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 显式添加WebJars资源处理器
        registry.addResourceHandler("/webjars/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/");
    }
}